"""
Inference wrapper around the trained arrival-delay model.

Artifact: ``ML/arrival_delay_model.pt`` (written by
``ML/arrival_delay_training.ipynb``). It is a ``torch.save`` bundle of::

    {"state_dict": ..., "config": ..., "x_mean": ..., "x_scale": ..., "metrics": ...}

The feature pipeline below is a direct port of the notebook's build step:
the eight numeric columns in ``config["numeric_columns"]`` order, then a
12-slot month one-hot, then a 7-slot day-of-week one-hot, standardised
with the scaler that was fitted on the training split only. The network is
rebuilt from ``config["hidden"]`` so the layer sizes always match the
saved weights.

PyTorch is imported lazily-tolerant: when torch is missing (or the artifact
cannot be found) the module degrades to "model unavailable" and the API
falls back to the demo dataset instead of failing the request.
"""

import math
import os
import threading

try:
    import torch
    from torch import nn

    TORCH_AVAILABLE = True
except Exception:  # pragma: no cover - depends on the environment
    torch = None
    nn = None
    TORCH_AVAILABLE = False


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(BACKEND_DIR)
DEFAULT_ARTIFACT_PATH = os.path.join(REPO_ROOT, "ML", "arrival_delay_model.pt")

_LOCK = threading.Lock()
_MODEL = None
_ARTIFACT = None
_LOAD_ERROR = None
_LOAD_ATTEMPTED = False


def artifact_path():
    """Path of the trained artifact. Override with DELAY_MODEL_PATH."""
    return os.environ.get("DELAY_MODEL_PATH") or DEFAULT_ARTIFACT_PATH


def _build_model(n_in, hidden, dropout):
    """Rebuild the trained MLP: Linear -> BN -> ReLU -> Dropout per hidden layer.

    The layer names have to match the notebook (``self.net`` holding the
    Sequential) so the saved state_dict loads unchanged.
    """

    class DelayPredictor(nn.Module):
        def __init__(self):
            super().__init__()
            layers = []
            previous = n_in
            for position, width in enumerate(hidden):
                layers.append(nn.Linear(previous, width))
                if position < len(hidden) - 1:
                    layers += [nn.BatchNorm1d(width), nn.ReLU(), nn.Dropout(dropout)]
                else:
                    layers.append(nn.ReLU())
                previous = width
            layers.append(nn.Linear(previous, 1))
            self.net = nn.Sequential(*layers)

        def forward(self, x):
            return self.net(x)

    return DelayPredictor()


def _read_artifact(path):
    try:
        return torch.load(path, map_location="cpu", weights_only=True)
    except Exception:
        # Older artifacts may contain plain python objects.
        return torch.load(path, map_location="cpu", weights_only=False)


def load_model():
    """Load and cache the artifact + network.

    Returns ``(model, artifact)``. Both are ``None`` when the model cannot
    be used; ``load_error()`` then explains why.
    """
    global _MODEL, _ARTIFACT, _LOAD_ERROR, _LOAD_ATTEMPTED

    if _MODEL is not None:
        return _MODEL, _ARTIFACT

    with _LOCK:
        if _MODEL is not None:
            return _MODEL, _ARTIFACT
        if _LOAD_ATTEMPTED:
            return None, None
        _LOAD_ATTEMPTED = True

        if not TORCH_AVAILABLE:
            _LOAD_ERROR = "PyTorch is not installed in this environment."
            return None, None

        path = artifact_path()
        if not os.path.exists(path):
            _LOAD_ERROR = "Model artifact not found at {}.".format(path)
            return None, None

        try:
            artifact = _read_artifact(path)
            config = artifact["config"]
            n_in = (
                len(config["numeric_columns"])
                + len(config["month_levels"])
                + len(config["dow_levels"])
            )
            model = _build_model(n_in, config["hidden"], config["dropout"])
            model.load_state_dict(artifact["state_dict"])
            model.eval()
        except Exception as exc:
            _LOAD_ERROR = "Failed to load model artifact: {}".format(exc)
            return None, None

        _ARTIFACT = artifact
        _MODEL = model
        return _MODEL, _ARTIFACT


def load_error():
    """Reason the model is unavailable, or None when it loaded fine."""
    return _LOAD_ERROR


def parse_clock(value):
    """Minutes since midnight for 'HH:MM', 'HH:MM:SS', 'HHMM', 545 or an ISO stamp."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        total = int(value)
        return ((total // 100) % 24) * 60 + (total % 100)

    text = str(value).strip()
    if not text:
        return None
    if "T" in text:
        text = text.split("T", 1)[1]
    elif " " in text:
        # 'YYYY-MM-DD HH:MM' style stamps
        text = text.split(" ", 1)[1]
    text = text.replace("Z", "").split("+")[0].strip()
    if ":" in text:
        parts = text.split(":")
        try:
            hours = int(parts[0])
            minutes = int(parts[1]) if len(parts) > 1 else 0
        except ValueError:
            return None
        return (hours % 24) * 60 + minutes
    if text.isdigit():
        total = int(text)
        return ((total // 100) % 24) * 60 + (total % 100)
    return None


def cyclic_features(minutes_since_midnight):
    """(sin, cos) encoding of a time of day, matching the notebook."""
    angle = 2.0 * math.pi * minutes_since_midnight / 1440.0
    return math.sin(angle), math.cos(angle)


def build_feature_row(numeric_values, month, day_of_week, artifact):
    """Assemble the 27-element, standardised feature row for one flight."""
    config = artifact["config"]
    n_months = len(config["month_levels"])
    n_dow = len(config["dow_levels"])

    month_index = int(month) - 1
    dow_index = int(day_of_week) - 1
    if not 0 <= month_index < n_months:
        raise ValueError("month {} is outside the trained range 1-{}".format(month, n_months))
    if not 0 <= dow_index < n_dow:
        raise ValueError("day_of_week {} is outside the trained range 1-{}".format(day_of_week, n_dow))

    row = [float(numeric_values[name]) for name in config["numeric_columns"]]

    month_one_hot = [0.0] * n_months
    month_one_hot[month_index] = 1.0
    dow_one_hot = [0.0] * n_dow
    dow_one_hot[dow_index] = 1.0

    row = row + month_one_hot + dow_one_hot

    mean = artifact["x_mean"].tolist()
    scale = artifact["x_scale"].tolist()
    return [(value - m) / s for value, m, s in zip(row, mean, scale)]


def predict_arrival_delay(numeric_values, month, day_of_week):
    """Predicted arrival delay in minutes, or None when the model is unavailable."""
    model, artifact = load_model()
    if model is None:
        return None

    row = build_feature_row(numeric_values, month, day_of_week, artifact)
    with torch.no_grad():
        tensor = torch.tensor([row], dtype=torch.float32)
        prediction = model(tensor).squeeze(1).item()
    return float(prediction)


def model_status():
    """Describe the loaded model (or why it is unavailable)."""
    model, artifact = load_model()
    path = artifact_path()
    if model is None:
        return {
            "available": False,
            "reason": load_error(),
            "artifact_path": path,
        }

    config = artifact["config"]
    return {
        "available": True,
        "name": os.path.basename(path),
        "artifact_path": path,
        "target": config.get("target"),
        "architecture": "MLP {}-{}-1".format(
            len(config["numeric_columns"])
            + len(config["month_levels"])
            + len(config["dow_levels"]),
            "-".join(str(width) for width in config["hidden"]),
        ),
        "numeric_features": list(config["numeric_columns"]),
        "metrics": {key: float(value) for key, value in artifact.get("metrics", {}).items()},
        "trained_on": "US BTS 2024 on-time performance data (ML/flight_data_2024.csv)",
    }

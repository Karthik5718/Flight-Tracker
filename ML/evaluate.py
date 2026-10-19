import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

csv_path = "flight_data_2024.csv"
artifact_path = "arrival_delay_model.pt"
batch_size = 65536


def hhmm_to_mins(values):
    return ((values // 100) % 24) * 60 + (values % 100)


def load():
    return torch.load(artifact_path, map_location="cpu", weights_only=False)


def read_data(config):
    needed = {"month", "day_of_month", "day_of_week", "crs_dep_time", "crs_arr_time",
              "cancelled", "diverted", "crs_elapsed_time", "distance", config["target"]}
    if config["observed_departure_delay"]:
        needed.add("dep_delay")
    dtypes = {"month": "int16", "day_of_month": "int16", "day_of_week": "int16",
              "crs_dep_time": "int32", "crs_arr_time": "int32", "dep_delay": "float32",
              config["target"]: "float32", "cancelled": "int8", "diverted": "int8",
              "crs_elapsed_time": "float32", "distance": "float32"}
    df = pd.read_csv(csv_path, usecols=list(needed), dtype=dtypes)
    df = df[(df.cancelled == 0) & (df.diverted == 0)]
    df = df.dropna(subset=[config["target"], "crs_elapsed_time", "crs_dep_time",
                           "crs_arr_time", "distance", "dep_delay"]).reset_index(drop=True)
    return df


def build_features(df, config):
    dep_mins = hhmm_to_mins(df.crs_dep_time.to_numpy()).astype(np.float32)
    arr_mins = hhmm_to_mins(df.crs_arr_time.to_numpy()).astype(np.float32)
    available = {
        "crs_elapsed_time": df.crs_elapsed_time.to_numpy(dtype=np.float32),
        "distance": df.distance.to_numpy(dtype=np.float32),
        "day_of_month": df.day_of_month.to_numpy(dtype=np.float32),
        "dep_sin": np.sin(2 * np.pi * dep_mins / 1440).astype(np.float32),
        "dep_cos": np.cos(2 * np.pi * dep_mins / 1440).astype(np.float32),
        "arr_sin": np.sin(2 * np.pi * arr_mins / 1440).astype(np.float32),
        "arr_cos": np.cos(2 * np.pi * arr_mins / 1440).astype(np.float32),
        "dep_delay": df.dep_delay.to_numpy(dtype=np.float32),
    }
    numeric = [available[name] for name in config["numeric_columns"]]
    n_months = len(config["month_levels"])
    n_dow = len(config["dow_levels"])

    X = np.empty((len(df), len(numeric) + n_months + n_dow), dtype=np.float32)
    for column, values in enumerate(numeric):
        X[:, column] = values
    rows = np.arange(len(df))
    offset = len(numeric)
    X[rows, offset + df.month.to_numpy() - 1] = 1.0
    X[rows, offset + n_months + df.day_of_week.to_numpy() - 1] = 1.0

    X -= artifact["x_mean"].numpy()
    X /= artifact["x_scale"].numpy()
    return X


class DelayPredictor(nn.Module):
    def __init__(self, n_in, hidden, dropout):
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


def rows_for(df, days):
    day_key = df.month.to_numpy() * 32 + df.day_of_month.to_numpy()
    return np.flatnonzero(np.isin(day_key, np.asarray(days)))


def predict(model, X, rows, device):
    preds = []
    model.eval()
    with torch.no_grad():
        for start in range(0, len(rows), batch_size):
            batch = torch.from_numpy(X[rows[start:start + batch_size]]).to(device)
            preds.append(model(batch).squeeze(1).cpu())
    return torch.cat(preds).numpy()


def score(name, actual, preds, train_mean):
    errors = np.abs(actual - preds)
    baseline = np.full_like(actual, train_mean)
    return name, {
        "n": int(len(actual)),
        "mae": mean_absolute_error(actual, preds),
        "rmse": float(np.sqrt(mean_squared_error(actual, preds))),
        "r2": r2_score(actual, preds),
        "median ae": float(np.median(errors)),
        "p90 ae": float(np.percentile(errors, 90)),
        "within 15": float((errors <= 15).mean()),
        "within 30": float((errors <= 30).mean()),
        "bias": float((preds - actual).mean()),
        "baseline mae": mean_absolute_error(actual, baseline),
    }


artifact = load()
config = artifact["config"]
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

df = read_data(config)
X = build_features(df, config)
model = DelayPredictor(X.shape[1], config["hidden"], config["dropout"])
model.load_state_dict(artifact["state_dict"])
model = model.to(device)

rows = {split: rows_for(df, days) for split, days in config["split_days"].items()}
train_mean = df[config["target"]].to_numpy(dtype=np.float32)[rows["train"]].mean()

results = []
for split in ["val", "test"]:
    actual = df[config["target"]].to_numpy(dtype=np.float32)[rows[split]]
    preds = predict(model, X, rows[split], device)
    results.append(score(split, actual, preds, train_mean))

width = max(len(name) for name, _ in results)
for name, values in results:
    print(f"\n{name}")
    for key, value in values.items():
        print(f"  {key:14s} {value:>12}" if isinstance(value, int) else f"  {key:14s} {value:10.4f}")

print("\nartifact metrics at training time")
for key, value in artifact["metrics"].items():
    print(f"  {key:14s} {value:10.4f}")
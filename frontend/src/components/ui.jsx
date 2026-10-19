import React from 'react';

/**
 * Shared presentational pieces. Pages compose these instead of repeating
 * the same inline-style blocks, so spacing, radii and type stay consistent.
 */

export const PageHead = ({ title, lede, children }) => (
  <header className="page-head">
    <div>
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
    </div>
    {children && <div className="row-gap">{children}</div>}
  </header>
);

export const Panel = ({ title, actions, children, flush = false, raised = false, className = '' }) => {
  const classes = ['panel', flush ? 'panel--flush' : '', raised ? 'panel--raised' : '', className]
    .filter(Boolean)
    .join(' ');
  if (flush) {
    return (
      <section className={classes}>
        {title && (
          <div className="panel__head">
            <span className="panel__title">{title}</span>
            {actions && <div className="row-gap">{actions}</div>}
          </div>
        )}
        {children}
      </section>
    );
  }
  return (
    <section className={classes}>
      {title && (
        <div className="panel__head" style={{ margin: '-22px -22px 22px', borderRadius: 'var(--r-panel) var(--r-panel) 0 0' }}>
          <span className="panel__title">{title}</span>
          {actions && <div className="row-gap">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

export const Stat = ({ label, value, meta, tone }) => (
  <div className="stat">
    <span className="stat__label">{label}</span>
    <span className="stat__value" style={tone ? { color: `var(--${tone})` } : undefined}>
      {value}
    </span>
    {meta && <span className="stat__meta">{meta}</span>}
  </div>
);

export const StatGrid = ({ children }) => <div className="stat-grid">{children}</div>;

export const Field = ({ label, hint, children }) => (
  <div className="field">
    {label && <label>{label}</label>}
    {children}
    {hint && <span className="note">{hint}</span>}
  </div>
);

export const EmptyState = ({ children }) => <div className="empty">{children}</div>;

const STATUS_TONE = {
  active: 'ok',
  'en-route': 'ok',
  landed: 'ok',
  on_time: 'ok',
  delayed: 'warn',
  diverted: 'warn',
  cancelled: 'bad',
  canceled: 'bad',
};

export const StatusChip = ({ status, label }) => {
  const key = String(status || '').toLowerCase();
  const tone = STATUS_TONE[key];
  return (
    <span className={`chip${tone ? ` chip--${tone}` : ''}`}>
      <span className="dot" />
      {label || status || 'Unknown'}
    </span>
  );
};

export const DelayChip = ({ minutes }) => {
  if (minutes == null) return <span className="note">—</span>;
  const value = Math.round(minutes);
  const tone = value > 0 ? 'warn' : 'ok';
  return (
    <span className={`chip chip--${tone}`}>
      {value > 0 ? `+${value}m` : value === 0 ? 'On time' : `${value}m`}
    </span>
  );
};

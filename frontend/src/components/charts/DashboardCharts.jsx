import React from 'react';
import {
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

const COLORS = {
  primary: '#4da3ff',
  secondary: '#46c46a',
  accent: '#e0a02c',
  danger: '#e88a4c',
  critical: '#f4685f',
  muted: '#5d6a7a',
  grid: '#1e2732',
  text: '#e9eef5',
  textMuted: '#8b98a8',
};

const CHART_MARGIN = { top: 12, right: 18, left: 4, bottom: 8 };

const tooltipStyle = {
  backgroundColor: '#11161f',
  border: '1px solid #2e3947',
  borderRadius: 8,
  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
  color: COLORS.text,
  fontSize: '0.8rem',
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const axisStyle = {
  fill: COLORS.textMuted,
  fontSize: 11,
  fontFamily: "'IBM Plex Mono', monospace",
};

const labelStyle = {
  fill: COLORS.textMuted,
  fontSize: 11,
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const frame = (height) => ({
  width: '100%',
  height,
  background: 'var(--surface)',
  borderRadius: 'var(--r-panel)',
  padding: '18px 14px 8px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
});

const legend = (
  <Legend
    wrapperStyle={{ paddingTop: '0.6rem', fontSize: '0.8rem' }}
    formatter={(value) => <span style={{ color: COLORS.textMuted }}>{value}</span>}
  />
);

// A label renderer that owns its own colour. Putting `fill` in the series
// style would be inherited by the sectors and override the per-cell colours.
const pieLabel = ({ name, value, percent }) => (
  <text fill={COLORS.textMuted} fontSize={12}>
    {`${name} ${value} · ${(percent * 100).toFixed(0)}%`}
  </text>
);

const compact = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v);

export function YearlyPassengerTrendChart({ data, height = 320 }) {
  if (!data?.length) return <div className="chart-empty">No records for this airport.</div>;

  return (
    <div style={frame(height)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="passengerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.22} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="year"
            tick={axisStyle}
            axisLine={{ stroke: COLORS.grid }}
            tickLine={false}
            label={{ value: 'Year', ...labelStyle, offset: 26 }}
          />
          <YAxis
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            width={52}
            label={{ value: 'Passengers', angle: -90, position: 'insideLeft', ...labelStyle, offset: 44 }}
            tickFormatter={compact}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [value.toLocaleString(), name]}
            labelFormatter={(label) => `Year ${label}`}
          />
          {legend}
          <Area
            type="monotone"
            dataKey="passengers"
            stroke={COLORS.primary}
            strokeWidth={1.75}
            fillOpacity={1}
            fill="url(#passengerGradient)"
            name="Passengers"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YearlyDeparturesArrivalsChart({ data, height = 320 }) {
  if (!data?.length) return <div className="chart-empty">No records for this airport.</div>;

  return (
    <div style={frame(height)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="year"
            tick={axisStyle}
            axisLine={{ stroke: COLORS.grid }}
            tickLine={false}
            label={{ value: 'Year', ...labelStyle, offset: 26 }}
          />
          <YAxis
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            width={52}
            label={{ value: 'Passengers', angle: -90, position: 'insideLeft', ...labelStyle, offset: 44 }}
            tickFormatter={compact}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [value.toLocaleString(), name]}
            labelFormatter={(label) => `Year ${label}`}
          />
          {legend}
          <Line
            type="monotone"
            dataKey="departures"
            stroke={COLORS.secondary}
            strokeWidth={1.75}
            dot={false}
            name="Embarking"
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="arrivals"
            stroke={COLORS.accent}
            strokeWidth={1.75}
            dot={false}
            name="Disembarking"
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyPassengerTrendChart({ data, height = 320 }) {
  if (!data?.length) return <div className="chart-empty">No records for this airport.</div>;

  const formatMonthLabel = (year, month) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const chartData = data.map((d) => ({
    ...d,
    label: formatMonthLabel(d.year, d.month),
    yearMonth: `${d.year}-${String(d.month).padStart(2, '0')}`,
  }));

  return (
    <div style={frame(height)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="monthlyPassengerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.22} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisStyle}
            axisLine={{ stroke: COLORS.grid }}
            tickLine={false}
            label={{ value: 'Month', ...labelStyle, offset: 26 }}
            interval={Math.max(1, Math.ceil(chartData.length / 12))}
          />
          <YAxis
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            width={52}
            label={{ value: 'Passengers', angle: -90, position: 'insideLeft', ...labelStyle, offset: 44 }}
            tickFormatter={compact}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value.toLocaleString(), name]} />
          {legend}
          <Area
            type="monotone"
            dataKey="passengers"
            stroke={COLORS.primary}
            strokeWidth={1.75}
            fillOpacity={1}
            fill="url(#monthlyPassengerGradient)"
            name="Passengers"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlySeasonalityChart({ data, height = 320 }) {
  if (!data?.length) return <div className="chart-empty">No records for this airport.</div>;

  return (
    <div style={frame(height)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN} layout="vertical">
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Average passengers', ...labelStyle, offset: 26 }}
            tickFormatter={compact}
          />
          <YAxis
            type="category"
            dataKey="monthName"
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value.toLocaleString(), name]} />
          <Bar dataKey="avgPassengers" name="Average" fill={COLORS.primary} radius={[0, 3, 3, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YearOverYearGrowthChart({ data, height = 300 }) {
  if (!data?.length) return <div className="chart-empty">Not enough history to compare years.</div>;

  return (
    <div style={frame(height)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="2 4" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="year"
            tick={axisStyle}
            axisLine={{ stroke: COLORS.grid }}
            tickLine={false}
            label={{ value: 'Year', ...labelStyle, offset: 26 }}
          />
          <YAxis
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            width={52}
            label={{ value: 'Change', angle: -90, position: 'insideLeft', ...labelStyle, offset: 44 }}
            tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, name]}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Bar
            dataKey="growth"
            name="Change"
            fill={({ value }) => (value >= 0 ? COLORS.secondary : COLORS.critical)}
            radius={[3, 3, 0, 0]}
            maxBarSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeparturesVsArrivalsChart({ departures, arrivals, height = 260 }) {
  const data = [
    { name: 'Departures', value: departures, color: COLORS.secondary },
    { name: 'Arrivals', value: arrivals, color: COLORS.accent },
  ].filter((d) => d.value > 0);

  if (!data.length) return <div className="chart-empty">No movements recorded.</div>;

  return (
    <div style={frame(height)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="82%"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            stroke="none"
            label={pieLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name]} />
          {legend}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DelayBreakdownChart({ delayedDepartures, delayedArrivals, onTime, unknown, height = 260 }) {
  const data = [
    { name: 'Late departures', value: delayedDepartures, color: COLORS.danger },
    { name: 'Late arrivals', value: delayedArrivals, color: COLORS.critical },
    { name: 'On time', value: onTime, color: COLORS.secondary },
    { name: 'Unreported', value: unknown, color: COLORS.muted },
  ].filter((d) => d.value > 0);

  if (!data.length) return <div className="chart-empty">No delay data.</div>;

  return (
    <div style={frame(height)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="82%"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            stroke="none"
            label={pieLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name]} />
          {legend}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CircularProgress({ value, size = 150, strokeWidth = 10, label = 'Load index' }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * (size / 2 - strokeWidth);
  const strokeDashoffset = circumference * (1 - clampedValue / 100);

  let color = COLORS.secondary;
  let category = 'Low';
  if (clampedValue >= 85) {
    color = COLORS.critical;
    category = 'Severe';
  } else if (clampedValue >= 65) {
    color = COLORS.danger;
    category = 'High';
  } else if (clampedValue >= 40) {
    color = COLORS.accent;
    category = 'Moderate';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - strokeWidth} fill="none" stroke={COLORS.grid} strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - strokeWidth}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="mono" style={{ fontSize: '2.4rem', fontWeight: 500, color: COLORS.text }}>
            {clampedValue}
          </span>
          <span className="stat__label">{label}</span>
        </div>
      </div>
      <span className="chip" style={{ color, background: `${color}1f` }}>
        {category}
      </span>
    </div>
  );
}

export function SummaryCard({ title, value, subtitle, trend, icon }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon && <span style={{ color: 'var(--text-3)', display: 'inline-flex' }}>{icon}</span>}
        <span className="stat__label">{title}</span>
      </div>
      <div className="mono" style={{ fontSize: '1.45rem', color: 'var(--text)', lineHeight: 1.2 }}>
        {value}
      </div>
      {subtitle && <div className="note" style={{ marginTop: 4 }}>{subtitle}</div>}
      {trend != null && (
        <div style={{ marginTop: 6, fontSize: '0.8rem', color: trend >= 0 ? COLORS.secondary : COLORS.critical }}>
          {trend >= 0 ? '+' : ''}
          {trend.toFixed(1)}% on the previous year
        </div>
      )}
    </div>
  );
}

import React from 'react';
import {
  LineChart,
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
  primary: '#4ade80',
  secondary: '#60a5fa',
  accent: '#facc15',
  danger: '#fb923c',
  critical: '#ef4444',
  muted: '#71717a',
  grid: '#27272a',
  text: '#d4d4d8',
  textMuted: '#a1a1aa',
};

const CHART_MARGIN = { top: 10, right: 30, left: 60, bottom: 40 };

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 8,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  color: '#f4f4f5',
  fontSize: '0.85rem',
  fontFamily: 'Space Grotesk, sans-serif',
};

const axisStyle = {
  stroke: '#71717a',
  fill: '#a1a1aa',
  fontSize: 11,
  fontFamily: 'Space Grotesk, sans-serif',
};

const labelStyle = {
  fill: '#a1a1aa',
  fontSize: 11,
  fontFamily: 'Space Grotesk, sans-serif',
  fontWeight: 600,
};

export function YearlyPassengerTrendChart({ data, height = 350 }) {
  if (!data?.length) return <div className="chart-empty">No data available</div>;
  
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="passengerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis 
            dataKey="year" 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Year', ...labelStyle, offset: 30 }}
          />
          <YAxis 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Passengers', angle: -90, position: 'insideLeft', ...labelStyle, offset: -40 }}
            tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v}
          />
          <Tooltip 
            contentStyle={tooltipStyle}
            formatter={(value, name) => [value.toLocaleString(), name]}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '0.5rem' }}
            formatter={(value) => <span style={{ color: COLORS.text }}>{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="passengers"
            stroke={COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#passengerGradient)"
            name="Passengers"
            dot={{ r: 4, strokeWidth: 2, fill: COLORS.primary, stroke: '#09090b' }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YearlyDeparturesArrivalsChart({ data, height = 350 }) {
  if (!data?.length) return <div className="chart-empty">No data available</div>;
  
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis 
            dataKey="year" 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Year', ...labelStyle, offset: 30 }}
          />
          <YAxis 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Flights', angle: -90, position: 'insideLeft', ...labelStyle, offset: -40 }}
            tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v}
          />
          <Tooltip 
            contentStyle={tooltipStyle}
            formatter={(value, name) => [value.toLocaleString(), name]}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '0.5rem' }}
            formatter={(value) => <span style={{ color: COLORS.text }}>{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="departures"
            stroke={COLORS.secondary}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: COLORS.secondary, stroke: '#09090b' }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            name="Departures"
          />
          <Line
            type="monotone"
            dataKey="arrivals"
            stroke={COLORS.accent}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: COLORS.accent, stroke: '#09090b' }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            name="Arrivals"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyPassengerTrendChart({ data, height = 350 }) {
  if (!data?.length) return <div className="chart-empty">No data available</div>;
  
  const formatMonthLabel = (year, month) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };
  
  const chartData = data.map(d => ({
    ...d,
    label: formatMonthLabel(d.year, d.month),
    yearMonth: `${d.year}-${String(d.month).padStart(2, '0')}`,
  }));
  
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="monthlyPassengerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis 
            dataKey="label" 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Month', ...labelStyle, offset: 30 }}
            interval={Math.max(1, Math.ceil(chartData.length / 12))}
          />
          <YAxis 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Passengers', angle: -90, position: 'insideLeft', ...labelStyle, offset: -40 }}
            tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v}
          />
          <Tooltip 
            contentStyle={tooltipStyle}
            formatter={(value, name) => [value.toLocaleString(), name]}
            labelFormatter={(label) => label}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '0.5rem' }}
            formatter={(value) => <span style={{ color: COLORS.text }}>{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="passengers"
            stroke={COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#monthlyPassengerGradient)"
            name="Passengers"
            dot={false}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlySeasonalityChart({ data, height = 350 }) {
  if (!data?.length) return <div className="chart-empty">No data available</div>;
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
          <XAxis 
            type="number" 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Avg Passengers', ...labelStyle, offset: 30 }}
            tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v}
          />
          <YAxis 
            type="category" 
            dataKey="monthName" 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Month', angle: -90, position: 'insideLeft', ...labelStyle, offset: -40 }}
            width={60}
          />
          <Tooltip 
            contentStyle={tooltipStyle}
            formatter={(value, name) => [value.toLocaleString(), name]}
            labelFormatter={(label) => label}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '0.5rem' }}
            formatter={(value) => <span style={{ color: COLORS.text }}>{value}</span>}
          />
          <Bar
            dataKey="avgPassengers"
            name="Avg Passengers"
            fill={COLORS.primary}
            radius={[0, 4, 4, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YearOverYearGrowthChart({ data, height = 350 }) {
  if (!data?.length) return <div className="chart-empty">No data available</div>;
  
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis 
            dataKey="year" 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Year', ...labelStyle, offset: 30 }}
          />
          <YAxis 
            tick={axisStyle} 
            axisLine={{ stroke: COLORS.grid }}
            tickLine={{ stroke: COLORS.grid }}
            label={{ value: 'Growth %', angle: -90, position: 'insideLeft', ...labelStyle, offset: -40 }}
            tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={tooltipStyle}
            formatter={(value, name) => [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, name]}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '0.5rem' }}
            formatter={(value) => <span style={{ color: COLORS.text }}>{value}</span>}
          />
          <Bar
            dataKey="growth"
            name="YoY Growth"
            fill={({ value }) => value >= 0 ? COLORS.primary : COLORS.critical}
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeparturesVsArrivalsChart({ departures, arrivals, height = 280 }) {
  const data = [
    { name: 'Departures', value: departures, color: COLORS.secondary },
    { name: 'Arrivals', value: arrivals, color: COLORS.accent },
  ].filter(d => d.value > 0);
  
  if (!data.length) return <div className="chart-empty">No flight data available</div>;
  
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={tooltipStyle}
            formatter={(value, name) => [value, name]}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '0.5rem' }}
            formatter={(value) => <span style={{ color: COLORS.text }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DelayBreakdownChart({ delayedDepartures, delayedArrivals, onTime, unknown, height = 280 }) {
  const data = [
    { name: 'Delayed Departures', value: delayedDepartures, color: COLORS.danger },
    { name: 'Delayed Arrivals', value: delayedArrivals, color: COLORS.critical },
    { name: 'On Time (Known)', value: onTime, color: COLORS.primary },
    { name: 'Unknown', value: unknown, color: COLORS.muted },
  ].filter(d => d.value > 0);
  
  if (!data.length) return <div className="chart-empty">No delay data available</div>;
  
  return (
    <div style={{ width: '100%', height, background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={tooltipStyle}
            formatter={(value, name) => [value, name]}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '0.5rem' }}
            formatter={(value) => <span style={{ color: COLORS.text }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CircularProgress({ value, size = 160, strokeWidth = 12, label = 'Congestion Score' }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * (size / 2 - strokeWidth);
  const strokeDashoffset = circumference * (1 - clampedValue / 100);
  
  let color = COLORS.primary;
  let category = 'Low';
  if (clampedValue >= 85) { color = COLORS.critical; category = 'Very High'; }
  else if (clampedValue >= 65) { color = COLORS.danger; category = 'High'; }
  else if (clampedValue >= 40) { color = COLORS.accent; category = 'Moderate'; }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - strokeWidth}
            fill="none"
            stroke={COLORS.grid}
            strokeWidth={strokeWidth}
          />
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
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>{clampedValue}</span>
          <span style={{ fontSize: '0.75rem', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          padding: '0.35rem 0.75rem',
          borderRadius: 999,
          fontSize: '0.75rem',
          fontWeight: 700,
          background: `${color}22`,
          border: `1px solid ${color}55`,
          color: color,
        }}>
          {category}
        </span>
      </div>
    </div>
  );
}

export function SummaryCard({ title, value, subtitle, trend, icon }) {
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {icon && <span style={{ color: COLORS.primary }}>{icon}</span>}
        <span style={{ color: COLORS.textMuted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.5rem', color: '#fff', lineHeight: 1.2 }}>{value}</div>
      {subtitle && <div style={{ color: COLORS.textMuted, fontSize: '0.8rem', marginTop: '0.25rem' }}>{subtitle}</div>}
      {trend && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: trend >= 0 ? COLORS.primary : COLORS.critical, fontWeight: 600 }}>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs prev year</div>}
    </div>
  );
}
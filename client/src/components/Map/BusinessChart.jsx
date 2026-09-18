import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { BANDS } from './ZipLayer.jsx';

const ROW_HEIGHT = 24;
const MAX_ROWS = 20;
// A long storefront name would squeeze the bars out of the panel.
const MAX_NAME = 18;
// Literal hex, as on the map layer. Bars show Mixed in yellow.
const BAR_COLORS = { good: BANDS.good.color, mixed: '#ffcc00', poor: BANDS.poor.color };

const SOURCE_LABEL = {
  reviews: 'community reviews',
  web: 'web reviews',
  restroom: 'restroom',
  brand: 'chain reviews',
  cei: 'CEI',
};

const bandFor = (score, method) => {
  if (score >= (method?.bands?.good ?? 95)) return 'good';
  if (score >= (method?.bands?.mixed ?? 85)) return 'mixed';
  return 'poor';
};

const shorten = (name) => (name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1)}…` : name);

// What the place scored and what it was scored from.
function BusinessTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="zip-chart-tooltip">
      <strong>{row.name}</strong>{' '}
      <span className="muted">
        {row.score} / 100 · {BANDS[row.band].label}
      </span>
      <div className="muted">
        {(row.sources ?? []).map((source) => SOURCE_LABEL[source] ?? source).join(', ') || 'no signals'}
      </div>
      {row.bad && <div>Has a bad review of this place</div>}
    </div>
  );
}

// Axis label, bold for the place whose profile is open.
function NameTick({ x, y, payload, selected }) {
  const active = payload.value === selected;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={11}
      style={{ fill: active ? 'var(--label)' : 'var(--label-secondary)', fontWeight: active ? 700 : 400 }}
    >
      {payload.value}
    </text>
  );
}

// One bar per business counted in this ZIP, 
// its length the business's score and its color the band. 
export default function BusinessChart({ businesses = [], selected, method }) {
  const ranked = businesses
    .filter((business) => business.score != null)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));


  const shown =
    ranked.length <= MAX_ROWS
      ? ranked
      : [...ranked.slice(0, MAX_ROWS - 5), ...ranked.slice(-5)];

  const rows = shown
    .map((business) => ({
      name: shorten(business.name),
      fullName: business.name,
      score: business.score,
      band: bandFor(business.score, method),
      sources: business.sources,
      bad: business.bad,
    }));

  if (rows.length === 0) return null;

  const selectedShort = selected ? shorten(selected) : null;

  return (
    <ResponsiveContainer width="100%" height={rows.length * ROW_HEIGHT + 12}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 0 }} barCategoryGap={4}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={118}
          interval={0}
          tickLine={false}
          axisLine={false}
          tick={<NameTick selected={selectedShort} />}
        />
        <ReferenceLine x={method?.bands?.mixed ?? 85} stroke="rgba(142,142,147,0.6)" strokeDasharray="3 3" />
        <ReferenceLine x={method?.bands?.good ?? 95} stroke="rgba(142,142,147,0.6)" strokeDasharray="3 3" />
        <Tooltip cursor={{ fill: 'rgba(120,120,128,0.12)' }} content={<BusinessTooltip />} />
        <Bar dataKey="score" radius={[0, 5, 5, 0]} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell
              key={row.fullName}
              fill={BAR_COLORS[row.band]}
              fillOpacity={selectedShort && row.name !== selectedShort ? 0.55 : 1}
            />
          ))}
          <LabelList dataKey="score" position="right" fontSize={11} fill="#8e8e93" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

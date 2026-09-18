import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { BANDS } from './ZipLayer.jsx';

const ROW_HEIGHT = 26;
const MAX_ROWS = 20;
// Literal hex, as on the map layer. Bars show Mixed in yellow.
const BAR_COLORS = { good: BANDS.good.color, mixed: '#ffcc00', poor: BANDS.poor.color };

// A ZIP's score, its band, and the places behind it.
function ScoreTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const zip = payload[0].payload.properties;
  const places = zip.businessBands ?? { good: 0, mixed: 0, poor: 0 };

  return (
    <div className="zip-chart-tooltip">
      <strong>{zip.zip}</strong>{' '}
      <span className="muted">
        {zip.score} / 100 · {BANDS[zip.band].label}
      </span>
      <div>
        {zip.scored} places: {places.good} high · {places.mixed} mixed · {places.poor} low
      </div>
      <div className="muted">
        {zip.signals.restroom} near a restroom · {zip.signals.web} with web reviews · {zip.signals.reviews} with
        community reviews
      </div>
    </div>
  );
}

// Axis label, bold for the selected ZIP. Inline style so the color tokens resolve.
function ZipTick({ x, y, payload, selected }) {
  const active = payload.value === selected;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={12}
      style={{ fill: active ? 'var(--label)' : 'var(--label-secondary)', fontWeight: active ? 700 : 400 }}
    >
      {payload.value}
    </text>
  );
}

// One bar per ZIP in view that has a score. Its length is the score and its
// color the band: green for High, yellow for Mixed, red for Low. Dashed lines
// mark where Mixed and High begin. Clicking a bar selects that ZIP.
export default function ZipChart({ zips, selected, onPick, method }) {
  const rows = zips
    .filter((zip) => zip.score != null)
    .sort((a, b) => b.score - a.score || a.zip.localeCompare(b.zip))
    .slice(0, MAX_ROWS)
    .map((zip) => ({ zip: zip.zip, score: zip.score, band: zip.band, properties: zip }));

  if (rows.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={rows.length * ROW_HEIGHT + 12}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 0 }} barCategoryGap={5}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="zip"
          width={48}
          interval={0}
          tickLine={false}
          axisLine={false}
          tick={<ZipTick selected={selected} />}
        />
        <ReferenceLine x={method?.bands?.mixed ?? 85} stroke="rgba(142,142,147,0.6)" strokeDasharray="3 3" />
        <ReferenceLine x={method?.bands?.good ?? 95} stroke="rgba(142,142,147,0.6)" strokeDasharray="3 3" />
        <Tooltip cursor={{ fill: 'rgba(120,120,128,0.12)' }} content={<ScoreTooltip />} />
        <Bar
          dataKey="score"
          radius={[0, 5, 5, 0]}
          isAnimationActive={false}
          cursor="pointer"
          onClick={(entry) => entry?.payload?.properties && onPick(entry.payload.properties)}
        >
          {rows.map((row) => (
            <Cell key={row.zip} fill={BAR_COLORS[row.band]} />
          ))}
          <LabelList dataKey="score" position="right" fontSize={11} fill="#8e8e93" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

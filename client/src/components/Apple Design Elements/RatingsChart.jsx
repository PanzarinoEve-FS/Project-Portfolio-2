import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// 1-5 star ratings
export default function RatingsChart({ reviews = [] }) {
  if (reviews.length === 0) return null;

  const data = [5, 4, 3, 2, 1].map((stars) => ({
    stars: `${stars}`,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  return (
    <ResponsiveContainer width="100%" height={132}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="stars"
          width={26}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--label-secondary)', fontSize: 12 }}
          tickFormatter={(v) => `${v}★`}
        />
        <Tooltip
          cursor={{ fill: 'rgba(120,120,128,0.12)' }}
          formatter={(value) => [`${value} review${value === 1 ? '' : 's'}`, '']}
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--separator)',
            borderRadius: 10,
            fontSize: 13,
          }}
        />
        <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={14}>
          {data.map((d) => (
            // Empty rows stay visible but recede, so the shape reads at a glance.
            <Cell key={d.stars} fill={d.count ? 'var(--orange)' : 'var(--fill)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

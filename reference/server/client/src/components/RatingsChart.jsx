import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const LABELS = {
  bathroomAccess: 'Bathroom Access',
  acceptance: 'Acceptance',
  staffFriendliness: 'Staff',
  safety: 'Safety',
  overall: 'Overall',
};

// `averages` is the virtual field the Business model computes from reviews.
export default function RatingsChart({ averages, reviewCount = 0 }) {
  if (!averages || reviewCount === 0) {
    return <p className="empty">No ratings yet. Be the first to review this place.</p>;
  }

  const data = Object.entries(LABELS).map(([key, label]) => ({
    stat: label,
    score: averages[key] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#d9d3e4" />
        <PolarAngleAxis dataKey="stat" tick={{ fill: '#3f3550', fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fill: '#8b81a0', fontSize: 10 }} />
        <Tooltip formatter={(value) => [`${value} / 5`, 'Score']} />
        <Radar
          name="Community rating"
          dataKey="score"
          stroke="#7c3aed"
          fill="#7c3aed"
          fillOpacity={0.45}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

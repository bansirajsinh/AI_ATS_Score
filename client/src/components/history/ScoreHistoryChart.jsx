import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ScoreHistoryChart({ scores = [] }) {
  if (scores.length === 0) return null;

  const data = scores.map((s, i) => ({
    index: i + 1,
    date: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Number(s.overallScore) || 0,
  })).reverse();

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Score History</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#f8fafc',
              fontSize: 13,
            }}
            formatter={(value) => [`${value}/100`, 'ATS Score']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
            activeDot={{ fill: '#818cf8', strokeWidth: 0, r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
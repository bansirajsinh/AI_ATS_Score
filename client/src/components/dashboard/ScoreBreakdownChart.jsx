import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_LABELS = {
  parseability: 'Parseability',
  keywordMatch: 'Keyword Match',
  contentQuality: 'Content Quality',
  formatting: 'Formatting',
};

const CATEGORY_COLORS = {
  parseability: '#818cf8',
  keywordMatch: '#34d399',
  contentQuality: '#fbbf24',
  formatting: '#f472b6',
};

export default function ScoreBreakdownChart({ breakdown = {} }) {
  const data = Object.entries(breakdown).map(([key, val]) => ({
    name: CATEGORY_LABELS[key] || key,
    score: val.score || 0,
    weight: val.weight || 0,
    color: CATEGORY_COLORS[key] || '#6366f1',
  }));

  if (data.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Score Breakdown</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            width={110}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#f8fafc',
              fontSize: 13,
            }}
            formatter={(value, name, props) => [`${value}/100 (${props.payload.weight}% weight)`, 'Score']}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 justify-center">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-text-muted">{item.name} ({item.weight}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
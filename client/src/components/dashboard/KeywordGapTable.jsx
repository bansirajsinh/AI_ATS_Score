import { useState } from 'react';

const MATCH_COLORS = {
  exact: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Exact Match' },
  semantic: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Semantic Match' },
  partial: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Partial Match' },
  missing: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Missing' },
};

export default function KeywordGapTable({ matches = [] }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority'); // priority | alpha | match

  if (matches.length === 0) return null;

  const filtered = filter === 'all'
    ? matches
    : matches.filter((m) => m.matchType === filter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'alpha') return a.keyword.localeCompare(b.keyword);
    if (sortBy === 'match') {
      const order = { missing: 0, partial: 1, semantic: 2, exact: 3 };
      return (order[a.matchType] || 0) - (order[b.matchType] || 0);
    }
    // priority: must-have missing first
    const aWeight = (a.isMustHave ? 0 : 1) + (a.matchType === 'missing' ? 0 : 2);
    const bWeight = (b.isMustHave ? 0 : 1) + (b.matchType === 'missing' ? 0 : 2);
    return aWeight - bWeight;
  });

  const counts = {
    all: matches.length,
    exact: matches.filter((m) => m.matchType === 'exact').length,
    semantic: matches.filter((m) => m.matchType === 'semantic').length,
    partial: matches.filter((m) => m.matchType === 'partial').length,
    missing: matches.filter((m) => m.matchType === 'missing').length,
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Keyword Gap Analysis</h3>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries({ all: 'All', ...Object.fromEntries(Object.entries(MATCH_COLORS).map(([k, v]) => [k, v.label])) })
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${filter === key ? 'bg-brand-600 text-white' : 'bg-white/5 text-text-muted hover:text-text-secondary'}`}
              >
                {label} ({counts[key] || 0})
              </button>
            ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="text-left px-4 py-3 font-medium text-text-secondary cursor-pointer hover:text-text-primary" onClick={() => setSortBy('alpha')}>
                Keyword {sortBy === 'alpha' && '↕'}
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary cursor-pointer hover:text-text-primary" onClick={() => setSortBy('match')}>
                Match {sortBy === 'match' && '↕'}
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Section</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((match, i) => {
              const colors = MATCH_COLORS[match.matchType] || MATCH_COLORS.missing;
              return (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{match.keyword}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${match.isMustHave ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-text-muted'}`}>
                      {match.isMustHave ? 'Required' : 'Nice-to-have'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {colors.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted capitalize">{match.resumeSection || '—'}</td>
                  <td className="px-4 py-3 text-xs text-text-muted max-w-xs truncate">{match.suggestedPlacement || '✓ Found'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
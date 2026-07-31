const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: '🚨' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: '⚠️' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: '📋' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: '💡' },
  info: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', icon: 'ℹ️' },
};

export default function IssuesList({ prioritizedIssues = [], allIssues = [] }) {
  if (prioritizedIssues.length === 0 && allIssues.length === 0) return null;

  return (
    <div className="w-full space-y-6">
      {/* Top Priority Fixes */}
      {prioritizedIssues.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            Fix these first for the biggest score jump
          </h3>
          <div className="space-y-2">
            {prioritizedIssues.map((issue, i) => {
              const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border} transition-all hover:scale-[1.01]`}
                >
                  <span className="text-sm mt-0.5 flex-shrink-0">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${style.text}`}>{issue.message}</p>
                    {issue.rewriteSuggestions && issue.rewriteSuggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-text-muted font-medium">Suggested rewrites:</p>
                        {issue.rewriteSuggestions.map((suggestion, j) => (
                          <p key={j} className="text-xs text-green-300/80 bg-green-500/5 rounded-lg px-3 py-1.5">
                            → {suggestion}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text} flex-shrink-0 capitalize`}>
                    {issue.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Issues */}
      {allIssues.length > prioritizedIssues.length && (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            All issues ({allIssues.length})
          </h3>
          <div className="space-y-1.5">
            {allIssues.slice(prioritizedIssues.length).map((issue, i) => {
              const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
              return (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <span className="text-xs mt-0.5">{style.icon}</span>
                  <p className="text-xs text-text-muted flex-1">{issue.message}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${style.bg} ${style.text} capitalize`}>
                    {issue.category || issue.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
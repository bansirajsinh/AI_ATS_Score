import { useEffect, useState } from 'react';

export default function ScoreGauge({ score = 0, band = 'high_risk', bandColor = '#ef4444', size = 200 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const bandLabels = {
    excellent: 'Excellent',
    competitive: 'Competitive',
    needs_work: 'Needs Work',
    high_risk: 'High Risk',
    critical: 'Critical',
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bandColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-[1500ms] ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${bandColor}40)` }}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-bold tabular-nums transition-all duration-1000"
            style={{ color: bandColor }}
          >
            {Math.round(animatedScore)}
          </span>
          <span className="text-xs text-text-muted mt-1">out of 100</span>
        </div>
      </div>

      {/* Band label */}
      <div
        className="px-4 py-1.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${bandColor}15`, color: bandColor }}
      >
        {bandLabels[band] || band}
      </div>
    </div>
  );
}
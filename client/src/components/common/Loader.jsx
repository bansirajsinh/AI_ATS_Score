export default function Loader({ message = 'Loading...', progress = null, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-12 ${className}`}>
      {/* Animated pulse ring */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500/20" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      <p className="text-sm text-text-secondary animate-pulse">{message}</p>
    </div>
  );
}
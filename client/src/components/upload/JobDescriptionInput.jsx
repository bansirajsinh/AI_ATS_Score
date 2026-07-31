import { useState } from 'react';

export default function JobDescriptionInput({ onSubmit, disabled = false }) {
  const [mode, setMode] = useState('text'); // 'text' | 'url'
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  const charCount = mode === 'text' ? text.length : url.length;

  function handleSubmit() {
    if (mode === 'text' && text.trim().length >= 10) {
      onSubmit?.({ rawText: text.trim(), sourceUrl: '' });
    } else if (mode === 'url' && url.trim()) {
      onSubmit?.({ rawText: '', sourceUrl: url.trim() });
    }
  }

  return (
    <div className="w-full relative mt-8">
      <div className="flex items-center justify-between mb-4">
        <label className="text-base font-semibold text-text-primary tracking-wide">
          Job Description <span className="text-text-muted font-normal text-sm ml-2">(optional, but highly recommended)</span>
        </label>
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 shadow-inner">
          <button
            onClick={() => setMode('text')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${mode === 'text' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-text-muted hover:text-text-primary'}`}
          >
            Paste Text
          </button>
          <button
            onClick={() => setMode('url')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${mode === 'url' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-text-muted hover:text-text-primary'}`}
          >
            Paste URL
          </button>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500/0 via-brand-500/20 to-brand-500/0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none"></div>
        
        {mode === 'text' ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder="Paste the full job description here for keyword matching and tailored feedback..."
            className="relative w-full h-40 px-5 py-4 bg-surface-raised/40 backdrop-blur-md border border-white/10 rounded-2xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.04] resize-none transition-all disabled:opacity-50 shadow-inner"
            aria-label="Job description text"
          />
        ) : (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled}
            placeholder="https://www.linkedin.com/jobs/view/..."
            className="relative w-full px-5 py-4 bg-surface-raised/40 backdrop-blur-md border border-white/10 rounded-2xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.04] transition-all disabled:opacity-50 shadow-inner"
            aria-label="Job posting URL"
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-3 px-1">
        <span className="text-xs font-medium text-text-muted tracking-wide">
          {charCount} CHARACTERS
        </span>
        {mode === 'text' && text.length > 0 && text.length < 10 && (
          <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md animate-pulse">
            Minimum 10 characters required
          </span>
        )}
      </div>
    </div>
  );
}
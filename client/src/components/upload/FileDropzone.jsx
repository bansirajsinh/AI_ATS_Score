import { useState, useRef, useCallback } from 'react';

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function FileDropzone({ onFileSelect, uploadProgress = null, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const validateFile = useCallback((file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES[file.type]) {
      return `Only PDF, DOCX, and TXT files are supported — you uploaded a ${ext} file`;
    }
    if (file.size > MAX_SIZE) {
      return `File exceeds the 5MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB). Please use a smaller file.`;
    }
    return null;
  }, []);

  const handleFile = useCallback((file) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    onFileSelect?.(file);
  }, [validateFile, onFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const files = e.dataTransfer?.files;
    if (files?.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const removeFile = useCallback((e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    onFileSelect?.(null);
  }, [onFileSelect]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full relative group">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume file. Accepts PDF, DOCX, and TXT files up to 5MB."
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full overflow-hidden rounded-2xl transition-all duration-500 cursor-pointer backdrop-blur-sm
          ${isDragOver
            ? 'bg-brand-500/10 scale-[1.02] shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]'
            : selectedFile
              ? 'bg-green-500/5'
              : 'bg-white/[0.02] hover:bg-white/[0.04]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          p-8 sm:p-12
        `}
      >
        {/* Animated Dashed Border using SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl" xmlns="http://www.w3.org/2000/svg">
          <rect 
            width="100%" 
            height="100%" 
            rx="16" 
            fill="none" 
            stroke={isDragOver ? '#818cf8' : selectedFile ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255,255,255,0.15)'} 
            strokeWidth="3" 
            strokeDasharray="12 12" 
            className={`transition-all duration-500 ${isDragOver ? 'animate-[dash_20s_linear_infinite]' : 'group-hover:stroke-[rgba(99,102,241,0.5)]'}`}
          />
        </svg>

        <style>{`
          @keyframes dash {
            to { stroke-dashoffset: -1000; }
          }
        `}</style>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden="true"
        />

        {selectedFile ? (
          /* File selected state */
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="relative w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]">
              <div className="absolute inset-0 bg-green-400/20 rounded-2xl animate-ping opacity-20"></div>
              <svg className="w-8 h-8 text-green-400 relative z-10" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-text-primary tracking-wide">{selectedFile.name}</p>
              <p className="text-sm text-text-muted mt-1">{formatSize(selectedFile.size)}</p>
            </div>

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="w-full max-w-xs mt-2">
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-green-400 rounded-full transition-all duration-300 relative"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-2 text-center font-medium tracking-wide">{uploadProgress}% UPLOADED</p>
              </div>
            )}

            {!uploadProgress && (
              <button
                onClick={removeFile}
                className="text-sm font-medium text-text-muted hover:text-red-400 transition-colors mt-2 px-4 py-2 rounded-lg hover:bg-red-500/10"
              >
                Remove file
              </button>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 border ${isDragOver ? 'bg-brand-500/20 border-brand-500/30 shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] scale-110' : 'bg-white/[0.03] border-white/5 group-hover:bg-brand-500/10 group-hover:border-brand-500/20'}`}>
              {isDragOver && <div className="absolute inset-0 bg-brand-400/20 rounded-2xl animate-ping opacity-30"></div>}
              <svg className={`w-10 h-10 transition-colors duration-300 relative z-10 ${isDragOver ? 'text-brand-300' : 'text-text-muted group-hover:text-brand-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-text-primary tracking-wide">
                {isDragOver ? 'Drop it here!' : 'Drag and drop your resume'}
              </p>
              <p className="text-sm text-text-muted mt-2">
                or <span className="text-brand-400 font-medium cursor-pointer hover:text-brand-300 hover:underline underline-offset-4 transition-all">browse files</span>
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-medium text-text-muted border border-white/5 uppercase tracking-wider">PDF</span>
              <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-medium text-text-muted border border-white/5 uppercase tracking-wider">DOCX</span>
              <span className="px-2 py-1 rounded bg-white/5 text-[10px] font-medium text-text-muted border border-white/5 uppercase tracking-wider">TXT</span>
              <span className="text-xs text-text-muted ml-1">— Max 5MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute -bottom-16 left-0 w-full animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg shadow-red-500/5">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
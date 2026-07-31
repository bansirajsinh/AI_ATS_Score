import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileDropzone from '../components/upload/FileDropzone';
import JobDescriptionInput from '../components/upload/JobDescriptionInput';
import Button from '../components/common/Button';
import { resumeAPI, jobAPI, scoreAPI } from '../services/api';

const STEPS = [
  { icon: '📄', title: 'Upload Resume', desc: 'Drop your PDF, DOCX, or TXT file into our secure analyzer' },
  { icon: '🎯', title: 'Add Target Job', desc: 'Paste the JD to get a tailored keyword match score' },
  { icon: '🤖', title: 'AI Analysis', desc: 'Our engine scores parseability, formatting, and content' },
  { icon: '📊', title: 'Get Results', desc: 'Receive actionable fixes prioritized by immediate impact' },
];

export default function Home() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [jdData, setJdData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload resume
      const formData = new FormData();
      formData.append('resume', file);

      const uploadRes = await resumeAPI.upload(formData, (e) => {
        const pct = Math.round((e.loaded * 100) / e.total);
        setUploadProgress(pct);
      });

      const resumeId = uploadRes.data.data.resume.id;

      // 2. Create JD if provided
      let jobId = null;
      if (jdData?.rawText && jdData.rawText.length >= 10) {
        const jdRes = await jobAPI.create(jdData);
        jobId = jdRes.data.data.jobDescription.id;
      }

      // 3. Start scoring
      const scoreRes = await scoreAPI.create({ resumeId, jobId });
      const scoreJobId = scoreRes.data.data.scoreJobId;

      // 4. Navigate to results
      navigate(`/results/${scoreJobId}`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Upload failed — check your connection and try again.';
      setError(msg);
      setUploadProgress(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 relative flex flex-col">
      {/* Ambient Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[0%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-600/15 blur-[120px] animate-blob mix-blend-screen"></div>
        <div className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[150px] animate-blob animation-delay-2000 mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] rounded-full bg-brand-400/10 blur-[130px] animate-blob animation-delay-4000 mix-blend-screen"></div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-12 px-4 z-10 flex-shrink-0">
        <div className="max-w-4xl mx-auto text-center relative animate-float">
          
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-brand-300 mb-8 backdrop-blur-md shadow-lg shadow-brand-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            AI-POWERED ATS ANALYSIS
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] mb-6">
            Get your resume past
            <br />
            <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-brand-300 bg-clip-text text-transparent drop-shadow-sm pb-2">
              every ATS filter
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary mt-6 max-w-2xl mx-auto leading-relaxed">
            Upload your resume, paste a job description, and get an instant
            ATS compatibility score with specific, actionable fixes — ranked
            by how much each one will boost your score.
          </p>
        </div>
      </section>

      {/* Upload Section */}
      <section className="w-full max-w-3xl mx-auto px-4 pb-24 relative z-10 flex-shrink-0">
        <div className="glass-panel p-6 sm:p-10 space-y-8 relative overflow-visible group">
          {/* Subtle inner glow in the glass panel */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent"></div>
          
          <FileDropzone
            onFileSelect={setFile}
            uploadProgress={uploadProgress}
            disabled={submitting}
          />

          <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest bg-[#151b2b]/90 backdrop-blur-md rounded-full py-1">
                Optional Step
              </span>
            </div>
          </div>

          <JobDescriptionInput
            onSubmit={setJdData}
            disabled={submitting}
          />

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

          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!file}
              loading={submitting}
              size="lg"
              className="w-full text-lg h-14"
            >
              {submitting ? 'Analyzing Resume...' : 'Analyze My Resume'}
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full mt-auto relative z-10 border-t border-white/5 bg-[#0b0f19]/80 backdrop-blur-3xl pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">How ResumeIQ works</h2>
            <p className="text-text-muted mt-4 text-lg">Four simple steps to a perfectly optimized resume.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="glass-card p-8 flex flex-col relative group overflow-hidden">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-all duration-500"></div>
                
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-6 shadow-inner group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                  {step.icon}
                </div>
                <div className="text-[10px] font-bold text-brand-400 tracking-widest uppercase mb-2">Step {i + 1}</div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
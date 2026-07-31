import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resumeAPI, scoreAPI } from '../services/api';
import ScoreHistoryChart from '../components/history/ScoreHistoryChart';
import Loader from '../components/common/Loader';

export default function Dashboard() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [resumeRes] = await Promise.all([
          resumeAPI.list(),
        ]);
        const resumeList = resumeRes.data.data.resumes;
        setResumes(resumeList);

        // Load scores for the most recent resume
        if (resumeList.length > 0) {
          const historyRes = await scoreAPI.getHistory(resumeList[0].id);
          setScores(historyRes.data.data.scores);
        }
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader message="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/" className="text-brand-400 underline underline-offset-2 text-sm">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Welcome back, {user?.email}</p>
        </div>
        <Link
          to="/"
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-500 transition-colors shadow-lg shadow-brand-600/25"
        >
          New Scan
        </Link>
      </div>

      {/* Score History Chart */}
      {scores.length > 0 && (
        <div className="bg-surface-raised/50 rounded-2xl border border-white/10 p-6">
          <ScoreHistoryChart scores={scores} />
        </div>
      )}

      {/* Resume List */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Your Resumes</h2>
        {resumes.length === 0 ? (
          <div className="bg-surface-raised/50 rounded-2xl border border-white/10 p-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm text-text-secondary mb-4">No resumes uploaded yet</p>
            <Link
              to="/"
              className="text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2"
            >
              Upload your first resume
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex items-center justify-between bg-surface-raised/30 rounded-xl border border-white/5 px-4 py-3 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{resume.fileName}</p>
                    <p className="text-xs text-text-muted">
                      v{resume.version} · {(resume.fileSize / 1024).toFixed(0)} KB ·{' '}
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/results/${resume.id}`}
                  className="text-xs text-brand-400 hover:text-brand-300 flex-shrink-0"
                >
                  View scores →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
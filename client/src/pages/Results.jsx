import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useResumeScore } from '../hooks/useResumeScore';
import Loader from '../components/common/Loader';
import ScoreGauge from '../components/dashboard/ScoreGauge';
import ScoreBreakdownChart from '../components/dashboard/ScoreBreakdownChart';
import KeywordGapTable from '../components/dashboard/KeywordGapTable';
import IssuesList from '../components/dashboard/IssuesList';
import SectionAccordion from '../components/dashboard/SectionAccordion';

export default function Results() {
  const { scoreJobId } = useParams();
  const { score, status, progress, progressLabel, error, startPolling } = useResumeScore();

  useEffect(() => {
    if (scoreJobId) {
      startPolling(scoreJobId);
    }
  }, [scoreJobId, startPolling]);

  if (status === 'polling') {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <Loader message={progressLabel} progress={progress} />
          <p className="text-xs text-text-muted mt-4">This usually takes 15-30 seconds</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Analysis Failed</h2>
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <a href="/" className="text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2">
            Try again with a new upload
          </a>
        </div>
      </div>
    );
  }

  if (!score || !score.report) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader message="Loading results..." />
      </div>
    );
  }

  const report = score.report;

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text-primary">Your ATS Score Report</h1>
        <p className="text-sm text-text-secondary mt-1">
          {score.resume?.fileName || 'Resume'} — analyzed {new Date(score.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Score + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-raised/50 rounded-2xl border border-white/10 p-6 flex items-center justify-center">
          <ScoreGauge
            score={report.overall || 0}
            band={report.band}
            bandColor={report.bandColor}
          />
        </div>
        <div className="bg-surface-raised/50 rounded-2xl border border-white/10 p-6">
          <ScoreBreakdownChart breakdown={report.breakdown} />
        </div>
      </div>

      {/* Prioritized Issues */}
      <div className="bg-surface-raised/50 rounded-2xl border border-white/10 p-6">
        <IssuesList
          prioritizedIssues={report.prioritizedIssues}
          allIssues={report.allIssues}
        />
      </div>

      {/* Keyword Gap Table */}
      {report.keywordMatch?.matches && report.keywordMatch.matches.length > 0 && (
        <div className="bg-surface-raised/50 rounded-2xl border border-white/10 p-6">
          <KeywordGapTable matches={report.keywordMatch.matches} />
        </div>
      )}

      {/* Section Accordion */}
      {report.sections && (
        <div className="bg-surface-raised/50 rounded-2xl border border-white/10 p-6">
          <SectionAccordion
            sections={report.sections.sections}
            sectionOrder={report.sections.sectionOrder}
          />
        </div>
      )}

      {/* AI Feedback */}
      {report.aiAnalysis?.overall_feedback && (
        <div className="bg-surface-raised/50 rounded-2xl border border-white/10 p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <span>🤖</span> AI Summary
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">{report.aiAnalysis.overall_feedback}</p>
        </div>
      )}
    </div>
  );
}
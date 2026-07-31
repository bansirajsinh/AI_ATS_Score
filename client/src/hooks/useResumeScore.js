import { useState, useCallback, useRef } from 'react';
import { scoreAPI } from '../services/api';

const POLL_INTERVAL = 2000;

const PROGRESS_STAGES = [
  { status: 'pending', label: 'Queued for analysis...', progress: 10 },
  { status: 'processing', label: 'Parsing resume...', progress: 30 },
  { status: 'processing', label: 'Extracting keywords...', progress: 50 },
  { status: 'processing', label: 'Scoring content...', progress: 70 },
  { status: 'processing', label: 'Generating report...', progress: 90 },
  { status: 'completed', label: 'Complete!', progress: 100 },
];

export function useResumeScore() {
  const [score, setScore] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | polling | completed | error
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const stageRef = useRef(0);

  const startPolling = useCallback((scoreJobId) => {
    setStatus('polling');
    setProgress(10);
    setProgressLabel('Queued for analysis...');
    setError(null);
    stageRef.current = 0;

    // Advance the visual progress narrative independently of backend status
    const stageInterval = setInterval(() => {
      stageRef.current = Math.min(stageRef.current + 1, PROGRESS_STAGES.length - 2);
      const stage = PROGRESS_STAGES[stageRef.current];
      setProgress(stage.progress);
      setProgressLabel(stage.label);
    }, 3000);

    intervalRef.current = setInterval(async () => {
      try {
        const res = await scoreAPI.get(scoreJobId);
        const data = res.data.data.score;

        if (data.status === 'completed') {
          clearInterval(intervalRef.current);
          clearInterval(stageInterval);
          setScore(data);
          setStatus('completed');
          setProgress(100);
          setProgressLabel('Complete!');
        } else if (data.status === 'failed') {
          clearInterval(intervalRef.current);
          clearInterval(stageInterval);
          setStatus('error');
          setError(data.errorMessage || 'Scoring failed. Please try again.');
        }
      } catch (err) {
        clearInterval(intervalRef.current);
        clearInterval(stageInterval);
        setStatus('error');
        setError(err.response?.data?.error?.message || 'Failed to fetch score results');
      }
    }, POLL_INTERVAL);

    // Cleanup after 5 minutes max (prevent zombie polls)
    setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        clearInterval(stageInterval);
        if (status !== 'completed') {
          setStatus('error');
          setError('Scoring timed out. Please try again.');
        }
      }
    }, 5 * 60 * 1000);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setScore(null);
    setStatus('idle');
    setProgress(0);
    setProgressLabel('');
    setError(null);
  }, []);

  return { score, status, progress, progressLabel, error, startPolling, reset };
}
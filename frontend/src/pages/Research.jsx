import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import JobTracker from '../components/JobTracker.jsx';
import { api } from '../lib/api.js';
import './Research.css';

const POLL_INTERVAL = 2500; // ms

export default function Research() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const jobId     = params.get('jobId');
  const company   = params.get('company') || 'Company';
  const cached    = params.get('cached') === 'true';

  const [status, setStatus]      = useState('pending');
  const [currentNode, setCurrentNode] = useState('');
  const [error, setError]        = useState('');
  const intervalRef = useRef(null);

  // If cached report — navigate immediately
  useEffect(() => {
    if (cached && jobId) {
      navigate(`/report/${jobId}`, { replace: true });
    }
  }, [cached, jobId, navigate]);

  // Connect to the SSE Stream
  useEffect(() => {
    if (!jobId || cached) return;

    const url = api.getJobStreamUrl(jobId);
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const res = JSON.parse(event.data);
        setStatus(res.status);
        setCurrentNode(res.currentNode || '');

        if (res.status === 'completed') {
          eventSource.close();
          // Short delay before redirect for visual feedback
          setTimeout(() => navigate(`/report/${jobId}`), 1200);
        } else if (res.status === 'failed') {
          eventSource.close();
          setError(res.error || 'Analysis failed.');
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err);
      }
    };

    eventSource.onerror = () => {
      setError('Connection to stream lost. Check your network.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, cached, navigate]);

  return (
    <div className="research-page">
      <Navbar />

      <main className="research-main container page-enter">
        <div className="research-card card">
          {/* Header */}
          <div className="research-header">
            <div className="research-company-badge">
              <span className="pill pill-primary">Analyzing</span>
              <h1 className="research-company">{company}</h1>
            </div>
            <p className="research-sub">
              Our AI investment committee is running four specialist analyses.
              This usually takes <strong>45–90 seconds</strong>.
            </p>
          </div>

          {/* Tracker */}
          <div className="research-tracker-wrap">
            <JobTracker currentNode={currentNode} status={status} />
          </div>

          {/* Error state */}
          {error && (
            <div className="research-error">
              <strong>Analysis failed:</strong> {error}
            </div>
          )}

          {/* Footer note */}
          {!error && status !== 'completed' && (
            <p className="research-note">
              🔒 Your analysis is private and stored securely. You can safely leave this page — the analysis will complete in the background and be saved to your dashboard.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

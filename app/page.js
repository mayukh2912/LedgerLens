'use client';

import { useState } from 'react';
import UploadZone from '../components/UploadZone';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const [status, setStatus] = useState('idle'); // idle | loading | error | done
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleFile(file) {
    setStatus('loading');
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong analyzing that file.');
      }
      setResult(data);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  function reset() {
    setStatus('idle');
    setResult(null);
    setError('');
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-rule bg-graph-paper">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-teal">
            <SignalMark />
            <span>Spreadsheet intelligence</span>
          </div>
          <h1 className="mt-6 font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-ink max-w-3xl">
            Every spreadsheet has a signal.
            <span className="block text-teal">LedgerLens finds it —</span>
            <span className="block text-amber-deep">and flags what breaks it.</span>
          </h1>
          <p className="mt-6 max-w-xl text-ink-soft text-lg leading-relaxed">
            Drop in any .xlsx, .xls, or .csv file. LedgerLens statistically profiles every column, surfaces
            correlations, and flags outliers using z-score and IQR anomaly detection.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {status !== 'done' && (
          <UploadZone onFile={handleFile} status={status} error={error} />
        )}

        {status === 'done' && result && (
          <Dashboard data={result} onReset={reset} />
        )}
      </section>

      <footer className="border-t border-rule mt-16">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs font-mono text-ink-soft flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>LedgerLens — built with Next.js, runs on Vercel</span>
          <span>Statistics computed server-side · no data stored</span>
        </div>
      </footer>
    </main>
  );
}

function SignalMark() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
      <path
        d="M0 7H4L6 1L9 13L11 7H14L15.5 4L17 10L18 7H20"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

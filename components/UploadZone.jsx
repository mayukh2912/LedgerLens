'use client';

import { useCallback, useRef, useState } from 'react';

export default function UploadZone({ onFile, status, error }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (files) => {
      if (files && files[0]) onFile(files[0]);
    },
    [onFile]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`focus-ring cursor-pointer rounded-lg border-2 border-dashed transition-colors
          ${dragOver ? 'border-teal bg-teal-soft' : 'border-rule bg-white'}
          px-8 py-16 text-center`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {status === 'loading' ? (
          <div className="space-y-4">
            <Spinner />
            <p className="font-mono text-sm text-ink-soft">Profiling columns, scanning for outliers…</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mx-auto w-fit rounded-full bg-teal-soft p-4 text-teal">
              <UploadIcon />
            </div>
            <p className="font-display text-xl font-semibold text-ink">
              Drop a spreadsheet here, or click to browse
            </p>
            <p className="text-sm text-ink-soft">.xlsx · .xls · .csv — up to 10MB, processed and discarded on the spot</p>
          </div>
        )}
      </div>

      {status === 'error' && error && (
        <div className="mt-4 rounded-md border border-amber bg-amber-soft px-4 py-3 text-sm text-amber-deep">
          <strong className="font-semibold">Couldn&apos;t read that file.</strong> {error}
        </div>
      )}

      <ExampleHint />
    </div>
  );
}

function ExampleHint() {
  return (
    <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
      <HintCard title="Column profiling" body="Type inference, mean/median/std-dev, quartiles, and missing-value counts for every column." />
      <HintCard title="Correlations" body="Pearson correlation across numeric columns — the relationships worth a second look." />
      <HintCard title="Anomaly detection" body="Z-score and IQR fencing flag outlier rows and rare one-off categories." />
    </div>
  );
}

function HintCard({ title, body }) {
  return (
    <div className="rounded-lg border border-rule bg-white p-4">
      <p className="font-display font-semibold text-ink text-sm">{title}</p>
      <p className="mt-1 text-ink-soft text-xs leading-relaxed">{body}</p>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4M12 4L7 9M12 4L17 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="mx-auto animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#DED9CC" strokeWidth="3" />
      <path d="M21 12A9 9 0 0 0 12 3" stroke="#2F6F6E" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

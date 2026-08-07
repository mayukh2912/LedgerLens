'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard({ data, onReset }) {
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const sheet = data.sheets[activeSheetIdx];
  const isPrimary = sheet.rowCount === [...data.sheets].sort((a, b) => b.rowCount - a.rowCount)[0].rowCount;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="font-mono text-xs text-ink-soft uppercase tracking-wide">{data.fileName}</p>
          {data.sheets.length > 1 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {data.sheets.map((s, i) => (
                <button
                  key={s.sheetName}
                  onClick={() => setActiveSheetIdx(i)}
                  className={`focus-ring rounded-md px-3 py-1 text-xs font-mono border transition-colors ${
                    i === activeSheetIdx ? 'bg-ink text-paper border-ink' : 'border-rule text-ink-soft hover:border-ink'
                  }`}
                >
                  {s.sheetName}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onReset} className="focus-ring text-sm font-mono text-teal hover:underline">
          ← analyze another file
        </button>
      </div>

      <OverviewCards sheet={sheet} />

      {isPrimary && data.aiInsights && <AiInsightsPanel insights={data.aiInsights} />}
      {isPrimary && !data.aiInsights && !data.aiAvailable && (
        <div className="mt-6 rounded-lg border border-rule bg-white px-5 py-4 text-sm text-ink-soft">
          <span className="font-mono text-xs uppercase tracking-wide text-teal">AI narrative — not configured</span>
          <p className="mt-1">
            Can set an <code className="font-mono bg-teal-soft px-1 rounded">API_KEY</code> environment variable to
            have an AI tool generate a plain-English summary alongside the statistics below. The statistical dashboard works
            fully without it.
          </p>
        </div>
      )}

      {sheet.correlations.length > 0 && <Correlations correlations={sheet.correlations} />}

      <ColumnGrid columns={sheet.columns} />

      <AnomalyTable anomalies={sheet.anomalies} total={sheet.anomalyCount} />
    </div>
  );
}

function OverviewCards({ sheet }) {
  const numericCount = sheet.columns.filter((c) => c.type === 'numeric').length;
  const categoricalCount = sheet.columns.filter((c) => c.type === 'categorical').length;
  const stats = [
    { label: 'Rows', value: sheet.rowCount.toLocaleString() },
    { label: 'Columns', value: sheet.columnCount },
    { label: 'Numeric / categorical', value: `${numericCount} / ${categoricalCount}` },
    { label: 'Anomalies flagged', value: sheet.anomalyCount, accent: sheet.anomalyCount > 0 },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-lg border p-4 ${s.accent ? 'border-amber bg-amber-soft' : 'border-rule bg-white'}`}>
          <p className={`font-display text-3xl font-semibold ${s.accent ? 'text-amber-deep' : 'text-ink'}`}>{s.value}</p>
          <p className="mt-1 text-xs font-mono uppercase tracking-wide text-ink-soft">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function AiInsightsPanel({ insights }) {
  return (
    <div className="mt-6 rounded-lg border border-teal/40 bg-teal-soft p-6">
      <span className="font-mono text-xs uppercase tracking-wide text-teal">AI narrative</span>
      <p className="mt-2 text-ink leading-relaxed">{insights.summary}</p>

      {insights.patterns?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-mono uppercase text-ink-soft mb-1.5">Patterns detected</p>
          <ul className="space-y-1">
            {insights.patterns.map((p, i) => (
              <li key={i} className="text-sm text-ink flex gap-2">
                <span className="text-teal">—</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.anomalyInsight && (
        <div className="mt-4">
          <p className="text-xs font-mono uppercase text-ink-soft mb-1.5">On the anomalies</p>
          <p className="text-sm text-ink">{insights.anomalyInsight}</p>
        </div>
      )}

      {insights.recommendations?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-mono uppercase text-ink-soft mb-1.5">Suggested next steps</p>
          <ul className="space-y-1">
            {insights.recommendations.map((r, i) => (
              <li key={i} className="text-sm text-ink flex gap-2">
                <span className="text-amber-deep">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Correlations({ correlations }) {
  return (
    <div className="mt-8">
      <SectionHeading eyebrow="Patterns" title="Correlated columns" />
      <div className="overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-xs font-mono uppercase text-ink-soft">
              <th className="px-4 py-3">Column A</th>
              <th className="px-4 py-3">Column B</th>
              <th className="px-4 py-3">Correlation (r)</th>
              <th className="px-4 py-3">Strength</th>
            </tr>
          </thead>
          <tbody>
            {correlations.map((c, i) => (
              <tr key={i} className={i % 2 ? 'bg-graph-paper/40' : ''}>
                <td className="px-4 py-2.5 font-medium">{c.a}</td>
                <td className="px-4 py-2.5 font-medium">{c.b}</td>
                <td className="px-4 py-2.5 font-mono">{c.r > 0 ? `+${c.r}` : c.r}</td>
                <td className="px-4 py-2.5 text-ink-soft">{strengthLabel(c.r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function strengthLabel(r) {
  const abs = Math.abs(r);
  const dir = r > 0 ? 'positive' : 'negative';
  if (abs > 0.8) return `Very strong ${dir}`;
  if (abs > 0.65) return `Strong ${dir}`;
  return `Moderate ${dir}`;
}

function ColumnGrid({ columns }) {
  return (
    <div className="mt-8">
      <SectionHeading eyebrow="Profile" title="Column by column" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {columns.map((col) => (
          <ColumnCard key={col.name} col={col} />
        ))}
      </div>
    </div>
  );
}

function ColumnCard({ col }) {
  return (
    <div className="rounded-lg border border-rule bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-display font-semibold text-ink truncate">{col.name}</p>
        <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-soft text-teal shrink-0">
          {col.type}
        </span>
      </div>
      {col.missing > 0 && (
        <p className="text-xs text-ink-soft mt-0.5">{col.missing} missing value{col.missing !== 1 ? 's' : ''}</p>
      )}

      {col.type === 'numeric' && col.stats && (
        <div>
          <div className="h-24 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={col.stats.histogram}>
                <Bar dataKey="count" fill="#2F6F6E" radius={[2, 2, 0, 0]} />
                <Tooltip
                  cursor={{ fill: '#E3EFEE' }}
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #DED9CC' }}
                  labelFormatter={(l) => `≈ ${l}`}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs font-mono">
            <Stat label="mean" value={fmt(col.stats.mean)} />
            <Stat label="median" value={fmt(col.stats.median)} />
            <Stat label="std dev" value={fmt(col.stats.stdDev)} />
            <Stat label="min" value={fmt(col.stats.min)} />
            <Stat label="max" value={fmt(col.stats.max)} />
            <Stat label="n" value={col.stats.count} />
          </dl>
        </div>
      )}

      {col.type === 'categorical' && col.stats && (
        <div>
          <div className="h-24 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={col.stats.top} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="value" width={70} tick={{ fontSize: 10 }} />
                <Bar dataKey="count" fill="#E8A33D" radius={[0, 2, 2, 0]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #DED9CC' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs font-mono text-ink-soft">{col.stats.uniqueCount} unique values</p>
        </div>
      )}

      {col.type === 'date' && (
        <p className="mt-3 text-xs text-ink-soft">Date column — e.g. {String(col.stats?.sample ?? '—')}</p>
      )}

      {col.type === 'text' && <p className="mt-3 text-xs text-ink-soft">Free-text column</p>}
      {col.type === 'empty' && <p className="mt-3 text-xs text-ink-soft">No values in this column</p>}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded bg-graph-paper px-2 py-1">
      <p className="text-ink-soft text-[10px] uppercase">{label}</p>
      <p className="text-ink font-medium">{value}</p>
    </div>
  );
}

function fmt(n) {
  if (typeof n !== 'number') return n;
  return Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : Number(n.toFixed(2));
}

function AnomalyTable({ anomalies, total }) {
  if (anomalies.length === 0) {
    return (
      <div className="mt-8">
        <SectionHeading eyebrow="Anomalies" title="Outlier detection" />
        <div className="rounded-lg border border-rule bg-white px-5 py-4 text-sm text-ink-soft">
          No anomalies crossed the z-score or IQR thresholds — this sheet looks statistically clean.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <SectionHeading eyebrow="Anomalies" title={`Flagged rows (${total} total)`} />
      <div className="overflow-x-auto rounded-lg border border-rule bg-white max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-rule text-left text-xs font-mono uppercase text-ink-soft">
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Column</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Severity</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a, i) => (
              <tr key={i} className={i % 2 ? 'bg-graph-paper/40' : ''}>
                <td className="px-4 py-2.5 font-mono">{a.row}</td>
                <td className="px-4 py-2.5 font-medium">{a.column}</td>
                <td className="px-4 py-2.5 font-mono">{String(a.value)}</td>
                <td className="px-4 py-2.5 text-ink-soft">{a.method}</td>
                <td className="px-4 py-2.5">
                  <SeverityBadge level={a.severity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > anomalies.length && (
        <p className="mt-2 text-xs text-ink-soft font-mono">Showing top {anomalies.length} of {total} flagged rows.</p>
      )}
    </div>
  );
}

function SeverityBadge({ level }) {
  const styles = {
    high: 'bg-amber text-white',
    medium: 'bg-amber-soft text-amber-deep',
    low: 'bg-teal-soft text-teal',
  };
  return <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${styles[level] || styles.low}`}>{level}</span>;
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-deep">{eyebrow}</span>
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
    </div>
  );
}

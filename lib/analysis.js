import * as XLSX from 'xlsx';

// ---------- type inference ----------

function inferType(values) {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'empty';

  const numeric = nonEmpty.filter((v) => typeof v === 'number' || (!isNaN(parseFloat(v)) && isFinite(v)));
  if (numeric.length / nonEmpty.length > 0.85) return 'numeric';

  const dateLike = nonEmpty.filter((v) => v instanceof Date || (typeof v === 'string' && !isNaN(Date.parse(v)) && /\d{4}|\d{1,2}[/-]\d{1,2}/.test(v)));
  if (dateLike.length / nonEmpty.length > 0.85) return 'date';

  const uniqueRatio = new Set(nonEmpty.map(String)).size / nonEmpty.length;
  if (uniqueRatio < 0.5) return 'categorical';

  return 'text';
}

// ---------- numeric stats ----------

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr, m) {
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1 || 1);
  return Math.sqrt(v);
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function numericStats(values) {
  const nums = values
    .map((v) => (typeof v === 'number' ? v : parseFloat(v)))
    .filter((v) => !isNaN(v) && isFinite(v));
  if (nums.length === 0) return null;

  const sorted = [...nums].sort((a, b) => a - b);
  const m = mean(nums);
  const sd = stdDev(nums, m);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  return {
    count: nums.length,
    mean: m,
    median: quantile(sorted, 0.5),
    stdDev: sd,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1,
    q3,
    iqr,
    // 10-bucket histogram for the sparkline / bar chart
    histogram: buildHistogram(sorted),
  };
}

function buildHistogram(sorted, buckets = 10) {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return [{ bucket: min.toFixed(2), count: sorted.length }];
  const width = (max - min) / buckets;
  const bins = Array.from({ length: buckets }, (_, i) => ({
    bucket: (min + i * width).toFixed(2),
    count: 0,
  }));
  sorted.forEach((v) => {
    let idx = Math.floor((v - min) / width);
    if (idx >= buckets) idx = buckets - 1;
    bins[idx].count += 1;
  });
  return bins;
}

function categoricalStats(values) {
  const counts = new Map();
  values.forEach((v) => {
    if (v === null || v === undefined || v === '') return;
    const key = String(v);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    uniqueCount: counts.size,
    top: sorted.slice(0, 8).map(([value, count]) => ({ value, count })),
  };
}

// ---------- anomaly detection ----------
// Two complementary statistical methods, no ML dependency required:
//  - Z-score: flags values far from the mean in units of standard deviation
//  - IQR (Tukey's fences): flags values outside 1.5x the interquartile range
// A value flagged by both methods is scored as higher severity.

function detectNumericAnomalies(columnName, rows, values, stats) {
  if (!stats || stats.stdDev === 0) return [];
  const anomalies = [];
  const lowFence = stats.q1 - 1.5 * stats.iqr;
  const highFence = stats.q3 + 1.5 * stats.iqr;

  values.forEach((raw, idx) => {
    const v = typeof raw === 'number' ? raw : parseFloat(raw);
    if (isNaN(v) || !isFinite(v)) return;
    const z = (v - stats.mean) / (stats.stdDev || 1);
    const byZ = Math.abs(z) > 3;
    const byIqr = v < lowFence || v > highFence;
    if (byZ || byIqr) {
      anomalies.push({
        row: idx + 2, // +2 => account for header row + 1-indexing, matches spreadsheet row numbers
        column: columnName,
        value: v,
        zScore: Number(z.toFixed(2)),
        method: byZ && byIqr ? 'z-score & IQR' : byZ ? 'z-score' : 'IQR',
        severity: Math.abs(z) > 4.5 || v < lowFence - stats.iqr || v > highFence + stats.iqr ? 'high' : 'medium',
      });
    }
  });
  return anomalies;
}

function detectCategoricalAnomalies(columnName, values, catStats) {
  // Rare categories (appearing once in a column with meaningful volume) are
  // surfaced as potential data-entry errors or one-off outlier events.
  if (values.length < 20) return [];
  const anomalies = [];
  const counts = new Map();
  values.forEach((v, idx) => {
    if (v === null || v === undefined || v === '') return;
    const key = String(v);
    if (!counts.has(key)) counts.set(key, []);
    counts.get(key).push(idx);
  });
  counts.forEach((indices, key) => {
    if (indices.length === 1 && counts.size > 5) {
      anomalies.push({
        row: indices[0] + 2,
        column: columnName,
        value: key,
        method: 'rare category',
        severity: 'low',
      });
    }
  });
  return anomalies;
}

// ---------- correlations ----------

function pearson(x, y) {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

function computeCorrelations(numericColumns) {
  const names = Object.keys(numericColumns);
  const pairs = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = numericColumns[names[i]];
      const b = numericColumns[names[j]];
      const len = Math.min(a.length, b.length);
      if (len < 3) continue;
      const r = pearson(a.slice(0, len), b.slice(0, len));
      if (Math.abs(r) >= 0.5) {
        pairs.push({ a: names[i], b: names[j], r: Number(r.toFixed(2)) });
      }
    }
  }
  return pairs.sort((p, q) => Math.abs(q.r) - Math.abs(p.r)).slice(0, 12);
}

// ---------- main entry point ----------

export function analyzeWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = workbook.SheetNames.map((sheetName) => analyzeSheet(workbook, sheetName));
  return { sheets };
}

function analyzeSheet(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
  const headerRow = rows.length > 0 ? Object.keys(rows[0]) : [];

  const columns = [];
  const numericColumnsForCorrelation = {};
  let allAnomalies = [];

  headerRow.forEach((col) => {
    const values = rows.map((r) => r[col]);
    const type = inferType(values);
    const column = { name: col, type, missing: values.filter((v) => v === null || v === undefined || v === '').length };

    if (type === 'numeric') {
      const stats = numericStats(values);
      column.stats = stats;
      const anomalies = detectNumericAnomalies(col, rows, values, stats);
      allAnomalies = allAnomalies.concat(anomalies);
      if (stats) {
        numericColumnsForCorrelation[col] = values
          .map((v) => (typeof v === 'number' ? v : parseFloat(v)))
          .filter((v) => !isNaN(v) && isFinite(v));
      }
    } else if (type === 'categorical') {
      const catStats = categoricalStats(values);
      column.stats = catStats;
      allAnomalies = allAnomalies.concat(detectCategoricalAnomalies(col, values, catStats));
    } else if (type === 'date') {
      column.stats = { sample: values.find((v) => v) };
    }

    columns.push(column);
  });

  const correlations = computeCorrelations(numericColumnsForCorrelation);

  // Rank anomalies: high severity first, cap payload size for the UI + AI prompt
  const severityRank = { high: 0, medium: 1, low: 2 };
  allAnomalies.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    sheetName,
    rowCount: rows.length,
    columnCount: headerRow.length,
    columns,
    correlations,
    anomalies: allAnomalies.slice(0, 200),
    anomalyCount: allAnomalies.length,
  };
}

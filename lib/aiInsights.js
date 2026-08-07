// Calls the Anthropic API with a compact statistical summary (never raw rows)
// to generate a short plain-English narrative: what the data shows, and why
// the flagged anomalies matter. Fully optional — the dashboard works with
// pure statistics if ANTHROPIC_API_KEY isn't set.

export async function generateAiInsights(sheetSummary) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const compact = {
    sheetName: sheetSummary.sheetName,
    rowCount: sheetSummary.rowCount,
    columnCount: sheetSummary.columnCount,
    columns: sheetSummary.columns.map((c) => ({
      name: c.name,
      type: c.type,
      missing: c.missing,
      stats:
        c.type === 'numeric'
          ? {
              mean: round(c.stats?.mean),
              median: round(c.stats?.median),
              stdDev: round(c.stats?.stdDev),
              min: c.stats?.min,
              max: c.stats?.max,
            }
          : c.type === 'categorical'
          ? { uniqueCount: c.stats?.uniqueCount, top: c.stats?.top?.slice(0, 5) }
          : undefined,
    })),
    topCorrelations: sheetSummary.correlations?.slice(0, 6),
    anomalySample: sheetSummary.anomalies?.slice(0, 15).map((a) => ({
      column: a.column,
      value: a.value,
      method: a.method,
      severity: a.severity,
    })),
    anomalyCount: sheetSummary.anomalyCount,
  };

  const prompt = `You are a data analyst reviewing a statistical summary of a spreadsheet (not the raw data). Respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "summary": "2-3 sentence plain-English overview of what this dataset appears to represent and its overall shape",
  "patterns": ["short bullet describing a notable pattern or trend", "..."],
  "anomalyInsight": "1-2 sentences on what the flagged anomalies most likely indicate and how concerning they are",
  "recommendations": ["short, actionable next step", "..."]
}
Keep each array to at most 4 items and each string under 220 characters. Base every statement strictly on the statistics provided below — do not invent figures.

Statistical summary:
${JSON.stringify(compact)}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data.content?.map((b) => b.text || '').join('') || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('AI insight generation failed:', err);
    return null;
  }
}

function round(n) {
  return typeof n === 'number' ? Number(n.toFixed(2)) : n;
}

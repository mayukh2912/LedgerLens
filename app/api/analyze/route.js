import { NextResponse } from 'next/server';
import { analyzeWorkbook } from '../../../lib/analysis';
import { generateAiInsights } from '../../../lib/aiInsights';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    }

    const validExt = /\.(xlsx|xls|csv)$/i.test(file.name || '');
    if (!validExt) {
      return NextResponse.json({ error: 'Please upload a .xlsx, .xls, or .csv file.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File is larger than 10MB. Try a smaller sheet.' }, { status: 400 });
    }

    const result = analyzeWorkbook(buffer);

    if (result.sheets.length === 0 || result.sheets.every((s) => s.rowCount === 0)) {
      return NextResponse.json({ error: 'No readable rows were found in that file.' }, { status: 400 });
    }

    // Only ask the AI about the primary (largest) sheet to keep this fast + cheap.
    const primarySheet = [...result.sheets].sort((a, b) => b.rowCount - a.rowCount)[0];
    const aiInsights = await generateAiInsights(primarySheet);

    return NextResponse.json({
      fileName: file.name,
      ...result,
      aiInsights,
      aiAvailable: Boolean(process.env.ANTHROPIC_API_KEY),
    });
  } catch (err) {
    console.error('Analyze route error:', err);
    return NextResponse.json({ error: 'Could not process that file. Make sure it is a valid spreadsheet.' }, { status: 500 });
  }
}

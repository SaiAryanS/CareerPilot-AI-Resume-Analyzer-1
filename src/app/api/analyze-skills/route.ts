
import { NextRequest, NextResponse } from 'next/server';
import { analyzeSkills } from '@/ai/flows/skill-matching';

export async function POST(req: NextRequest) {
  console.log('[/api/analyze-skills] - Received request');
  try {
    const { jobDescription, resume } = await req.json();

    if (!jobDescription || !resume) {
      console.log('[/api/analyze-skills] - Missing job description or resume');
      return NextResponse.json({ error: 'Missing job description or resume text.' }, { status: 400 });
    }

    console.log('[/api/analyze-skills] - Calling analyzeSkills flow...');
    const result = await analyzeSkills({
      jobDescription,
      resume,
    });
    console.log('[/api/analyze-skills] - analyzeSkills flow completed successfully.');

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/analyze-skills] - Error caught in analyze-skills endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

    // In development, return debug fields if available on the thrown error to
    // help diagnose normalization/validation failures (raw, normalized, final).
    const debug: any = {};
    if (process.env.NODE_ENV !== 'production') {
      if (error && typeof error === 'object') {
        const e: any = error as any;
        if ('raw' in e) debug.raw = e.raw;
        if ('normalized' in e) debug.normalized = e.normalized;
        if ('final' in e) debug.final = e.final;
      }
    }

    return NextResponse.json({ error: `Failed to analyze skills: ${errorMessage}`, debug }, { status: 500 });
  }
}

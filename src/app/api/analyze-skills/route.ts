
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
    return NextResponse.json({ error: `Failed to analyze skills: ${errorMessage}` }, { status: 500 });
  }
}

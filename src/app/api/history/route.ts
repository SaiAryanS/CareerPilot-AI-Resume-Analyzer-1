
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { z } from 'zod';

const historyQuerySchema = z.object({
  userEmail: z.string().email(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    const validation = historyQuerySchema.safeParse({ userEmail });

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid or missing userEmail parameter' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const analyses = await db
      .collection("analyses")
      .find({ userEmail: validation.data.userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(analyses, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch analysis history:', error);
    return NextResponse.json({ message: 'Failed to fetch analysis history' }, { status: 500 });
  }
}

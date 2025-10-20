
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { resumeFileName, jobDescription, matchScore, userEmail } = data;

    if (!resumeFileName || !jobDescription || typeof matchScore === 'undefined' || !userEmail) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(); // Use default DB from connection string

    const analysisCollection = db.collection('analyses');

    const result = await analysisCollection.insertOne({
      userEmail,
      resumeFileName,
      jobDescription,
      matchScore,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: 'Analysis saved successfully', id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Failed to save analysis:', error);
    return NextResponse.json({ message: 'Failed to save analysis' }, { status: 500 });
  }
}

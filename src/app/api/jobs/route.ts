
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { z } from 'zod';

const jobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
});

// GET all job descriptions
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const jobs = await db.collection('job_descriptions').find({}).sort({ title: 1 }).toArray();
    return NextResponse.json(jobs, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    return NextResponse.json({ message: 'Failed to fetch job descriptions' }, { status: 500 });
  }
}

// POST a new job description
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = jobSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { title, description } = validation.data;

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('job_descriptions').insertOne({
      title,
      description,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: 'Job created successfully', id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Failed to create job:', error);
    return NextResponse.json({ message: 'Failed to create job description' }, { status: 500 });
  }
}

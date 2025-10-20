
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const jobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
});

// PUT (Update) a job description
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid job ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = jobSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { title, description } = validation.data;

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('job_descriptions').updateOne(
      { _id: new ObjectId(id) },
      { $set: { title, description } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Job updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update job:', error);
    return NextResponse.json({ message: 'Failed to update job description' }, { status: 500 });
  }
}

// DELETE a job description
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid job ID' }, { status: 400 });
  }
  
  try {
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('job_descriptions').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Job deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete job:', error);
    return NextResponse.json({ message: 'Failed to delete job description' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// DELETE a user
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
  }
  
  try {
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    const { identifier, password } = validation.data;

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    // Find user by email or phone number
    const user = await usersCollection.findOne({
      $or: [{ email: identifier }, { phoneNumber: identifier }],
    });

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Compare submitted password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // In a real app, you'd create a session/JWT here.
    // For now, we'll return a success message and the user info (without password).
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ message: 'Login successful', user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}

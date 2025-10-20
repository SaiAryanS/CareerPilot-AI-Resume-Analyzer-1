
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const passwordValidation = new RegExp(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,30}$/
);

const registerSchema = z
  .object({
    username: z.string().min(3),
    email: z.string().email(),
    phoneNumber: z.string().min(10),
    password: z.string().refine((value) => passwordValidation.test(value)),
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { username, email, phoneNumber, password } = validation.data;

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email or phone number already exists' }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const result = await usersCollection.insertOne({
      username,
      email,
      phoneNumber,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json({ message: 'User registered successfully', userId: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error('Registration failed:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}

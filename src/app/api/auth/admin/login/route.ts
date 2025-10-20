
import { NextResponse } from 'next/server';
import { z } from 'zod';

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    // 1. Validate the request body
    const body = await request.json();
    const validation = adminLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    const { email, password } = validation.data;

    // 2. Securely get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('Admin credentials are not set in environment variables.');
      return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }

    // 3. Compare the submitted credentials with the environment variables
    const isAdmin = email === adminEmail && password === adminPassword;

    if (!isAdmin) {
      return NextResponse.json({ message: 'Invalid admin credentials' }, { status: 401 });
    }

    // In a real application, you would create a session/JWT here.
    // For now, we'll just confirm the login was successful.
    return NextResponse.json({ message: 'Admin login successful' }, { status: 200 });

  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}

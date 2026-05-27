import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, sendVerificationOTP } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();

    // Send OTP email
    await sendVerificationOTP(email, otp, name);

    // Return OTP to store in browser (as per user requirement)
    return NextResponse.json({
      success: true,
      otp, // Client will store this in localStorage/sessionStorage
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
    });
  } catch (error: any) {
    console.error('Error sending verification OTP:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

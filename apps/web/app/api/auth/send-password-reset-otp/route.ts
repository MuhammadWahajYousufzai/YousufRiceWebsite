import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, sendPasswordResetOTP } from '@/lib/email';
import { tablesDB, DATABASE_ID, CUSTOMERS_TABLE_ID, account } from "@/lib/appwrite";
import { Query } from 'appwrite';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists with this email
    const customerResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal('email', email)] });

    if (customerResponse.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, an OTP has been sent.',
      });
    }

    const customer = customerResponse.rows[0];

    // Generate OTP
    const otp = generateOTP();

    // Send OTP email
    await sendPasswordResetOTP(email, otp, customer.full_name);

    // Also initiate Appwrite's password recovery (this will send another email, but we'll use our OTP)
    try {
      await account.createRecovery({ email: email, url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password` });
    } catch (error) {
      // If recovery fails, continue with our OTP system
      console.log('Appwrite recovery failed, using OTP system:', error);
    }

    // Return OTP to store in browser (as per user requirement)
    return NextResponse.json({
      success: true,
      otp, // Client will store this in localStorage/sessionStorage
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      userId: customer.user_id, // Needed for password update
      email: email, // Store email for password update
    });
  } catch (error: any) {
    console.error('Error sending password reset OTP:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

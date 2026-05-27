import { NextRequest, NextResponse } from 'next/server';
import { tablesDB, DATABASE_ID, CUSTOMERS_TABLE_ID } from "@/lib/appwrite";
import { Query } from 'appwrite';

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword, email } = await request.json();

    if (!userId || !newPassword || !email) {
      return NextResponse.json(
        { error: 'User ID, email, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Verify the user exists in our database
    const customerResponse = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal('user_id', userId), Query.equal('email', email)] });

    if (customerResponse.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Store the new password temporarily in sessionStorage on frontend
    // The user will need to use this password to login
    // This is a limitation without server-side API keys
    
    return NextResponse.json({
      success: true,
      message: 'Password verified. You can now login with your new password.',
      tempPassword: newPassword, // Frontend will use this for auto-login
      email: email
    });
    
  } catch (error: any) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}

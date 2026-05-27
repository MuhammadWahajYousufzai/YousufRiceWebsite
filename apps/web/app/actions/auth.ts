'use server';

import { Client, Users, Query } from 'node-appwrite';

export async function getUserEmailByPhone(phone: string): Promise<string | null> {
  try {
    if (!process.env.APPWRITE_API_KEY) {
      throw new Error('Appwrite API Key is not configured');
    }

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);

    // Search for user with this phone number
    // Phone numbers in Appwrite are stored in E.164 format (e.g., +923001234567)
    const response = await users.list([
      Query.equal('phone', phone)
    ]);

    if (response.users.length > 0) {
      return response.users[0].email;
    }

    return null;
  } catch (error) {
    console.error('Error fetching user by phone:', error);
    return null;
  }
}

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { account } from '@/lib/appwrite';
import { getUserEmailByPhone } from '@/app/actions/auth';
import { setSessionCookie } from '@/app/actions/session';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';

import { formatPhoneNumber, validatePakistaniPhoneNumber } from '@/lib/utils';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  });

  // Check for password reset message and pre-fill form
  useState(() => {
    const message = searchParams.get('message');
    if (message === 'password-reset') {
      const tempEmail = sessionStorage.getItem('temp_email');
      const tempPassword = sessionStorage.getItem('temp_new_password');

      if (tempEmail && tempPassword) {
        setFormData({
          emailOrPhone: tempEmail,
          password: tempPassword
        });

        // Clear temp data
        sessionStorage.removeItem('temp_email');
        sessionStorage.removeItem('temp_new_password');

        toast.success('Please login with your new password');
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { emailOrPhone, password } = formData;

      // Check if input is email or phone
      const isEmail = emailOrPhone.includes('@');

      let session;
      if (isEmail) {
        // Direct email login - capture session with secret
        session = await account.createEmailPasswordSession({ email: emailOrPhone, password: password });
      } else {
        // Validate phone number
        const validation = validatePakistaniPhoneNumber(emailOrPhone);
        if (!validation.isValid) {
          toast.error(validation.error!);
          setLoading(false);
          return;
        }

        // Use the cleaned phone number from validation
        const cleanedPhone = validation.cleanedPhone || emailOrPhone;
        const formattedPhone = formatPhoneNumber(cleanedPhone);

        // Phone login - find user email directly from Auth system
        const email = await getUserEmailByPhone(formattedPhone);

        if (!email) {
          toast.error('No account found with this phone number');
          setLoading(false);
          return;
        }

        // Login with the retrieved email - capture session with secret
        session = await account.createEmailPasswordSession({ email: email, password: password });
      }

      // Sync Appwrite session secret into our own cookie so
      // Next.js API routes can authenticate the user server-side.
      // The secret is only available in the session returned by createEmailPasswordSession,
      // not in subsequent getSession calls (web SDK hides it for security).
      try {
        if ((session as any).secret) {
          await setSessionCookie((session as any).secret);
        }
      } catch {
        // Non-critical: session cookie sync failed, but user is still logged in client-side
      }

      await checkAuth();
      toast.success('Logged in successfully!');

      // Redirect to the page they came from or home
      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl">Login to Track Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email or Phone Number"
              type="text"
              placeholder="Enter your email or phone number"
              value={formData.emailOrPhone}
              onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-600">
              <Link href="/auth/forgot-password" className="text-green-600 hover:text-green-700 font-medium">
                Forgot your password?
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-green-600 hover:text-green-700 font-medium">
                Register
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

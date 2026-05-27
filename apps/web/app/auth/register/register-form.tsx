"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  account,
  tablesDB,
  DATABASE_ID,
  CUSTOMERS_TABLE_ID,
} from "@/lib/appwrite";
import { useAuthStore } from "@/lib/store/auth-store";
import { setSessionCookie } from "@/app/actions/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ID, Query } from "appwrite";
import toast from "react-hot-toast";
import OTPInput from "@/components/otp-input";
import { formatPhoneNumber, validatePakistaniPhoneNumber } from "@/lib/utils";

export default function RegisterForm() {
  const router = useRouter();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [otpData, setOtpData] = useState<{
    otp: string;
    expiresAt: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [cleanedPhone, setCleanedPhone] = useState("");



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    const validation = validatePakistaniPhoneNumber(formData.phone);
    if (!validation.isValid) {
      toast.error(validation.error || "Invalid phone number");
      return;
    }

    // Store the cleaned phone number in state for use in handleOTPVerify
    const cleaned = validation.cleanedPhone || formData.phone;
    setCleanedPhone(cleaned);

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(cleaned);

      // Check if phone number already exists
      const existingCustomer = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal("phone", formattedPhone)] });

      if (existingCustomer.rows.length > 0) {
        const customer = existingCustomer.rows[0];
        // If customer exists and has a real user_id (not guest), then it's a duplicate
        if (customer.user_id && customer.user_id !== "guest") {
          toast.error("An account with this phone number already exists");
          setLoading(false);
          return;
        }
        // If user_id is "guest" or missing, we allow registration to proceed
        // so they can claim this customer record
      }

      // Check if email already exists
      const existingEmail = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal("email", formData.email)] });

      if (existingEmail.rows.length > 0) {
        const customer = existingEmail.rows[0];
        // If customer exists and has a real user_id (not guest), then it's a duplicate
        if (customer.user_id && customer.user_id !== "guest") {
          toast.error("An account with this email already exists");
          setLoading(false);
          return;
        }
      }

      // Send OTP for email verification
      const response = await fetch("/api/auth/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, name: formData.name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      // Store OTP in browser storage
      sessionStorage.setItem(
        "registration_otp",
        JSON.stringify({
          otp: data.otp,
          expiresAt: data.expiresAt,
        })
      );

      setOtpData({ otp: data.otp, expiresAt: data.expiresAt });
      setStep("verify");
      toast.success("OTP sent to your email!");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (enteredOtp: string) => {
    setLoading(true);

    try {
      // Get stored OTP from sessionStorage
      const storedData = sessionStorage.getItem("registration_otp");
      if (!storedData) {
        toast.error("OTP expired. Please try again.");
        setStep("form");
        return;
      }

      const { otp, expiresAt } = JSON.parse(storedData);

      // Check if OTP expired
      if (Date.now() > expiresAt) {
        toast.error("OTP expired. Please try again.");
        sessionStorage.removeItem("registration_otp");
        setStep("form");
        setLoading(false);
        return;
      }

      // Verify OTP
      if (enteredOtp !== otp) {
        toast.error("Invalid OTP. Please try again.");
        setLoading(false);
        return;
      }

      // OTP verified - create account
      const user = await account.create({ userId: ID.unique(), email: formData.email, password: formData.password, name: formData.name });

      // Check if customer record exists to link
      const existingCustomerList = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal("phone", formatPhoneNumber(cleanedPhone))] });

      if (existingCustomerList.rows.length > 0) {
        // Update existing customer
        const customerToUpdate = existingCustomerList.rows[0];
        await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, rowId: customerToUpdate.$id, data: {
                        user_id: user.$id,
                        full_name: formData.name,
                        email: formData.email,
                      } });
      } else {
        // Create customer record
        await tablesDB.createRow({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, rowId: ID.unique(), data: {
                        user_id: user.$id,
                        full_name: formData.name,
                        phone: formatPhoneNumber(cleanedPhone),
                        email: formData.email,
                      } });
      }

      // Login the user - capture session with secret for server-side auth
      const session = await account.createEmailPasswordSession({ email: formData.email, password: formData.password });

      // Sync session secret into our own cookie for server-side auth
      // The secret is only available in the session returned by createEmailPasswordSession
      try {
        if ((session as any).secret) {
          await setSessionCookie((session as any).secret);
        }
      } catch {
        // Non-critical
      }

      // Update phone number in Appwrite Auth (after session is established)
      await account.updatePhone(
        formatPhoneNumber(cleanedPhone),
        formData.password
      );

      await checkAuth();

      // Clear OTP from storage
      sessionStorage.removeItem("registration_otp");

      toast.success("Account created successfully!");
      router.push("/");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, name: formData.name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      sessionStorage.setItem(
        "registration_otp",
        JSON.stringify({
          otp: data.otp,
          expiresAt: data.expiresAt,
        })
      );

      setOtpData({ otp: data.otp, expiresAt: data.expiresAt });
      toast.success("New OTP sent to your email!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl">
            {step === "form" ? "Register" : "Verify Email"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Enter your full name"
              />

              <Input
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                placeholder="03XX XXXXXXX"
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder="your@email.com"
              />

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                placeholder="At least 8 characters"
              />

              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                placeholder="Re-enter your password"
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending OTP..." : "Continue"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-6">
                  We've sent a 6-digit OTP to
                  <br />
                  <span className="font-semibold text-gray-900">
                    {formData.email}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Enter OTP
                </label>
                <OTPInput onComplete={handleOTPVerify} disabled={loading} />
              </div>

              <div className="text-center space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Resending..." : "Resend OTP"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep("form");
                    sessionStorage.removeItem("registration_otp");
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  Back to Registration
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

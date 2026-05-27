"use client";

import { useState, useEffect, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  tablesDB,
  DATABASE_ID,
  CUSTOMERS_TABLE_ID,
  account,
} from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Query, ID } from "appwrite";
import toast from "react-hot-toast";
import { ArrowLeft, Gift, Copy, Check } from "lucide-react";
import Link from "next/link";
import { DiscountService } from "@/lib/services/discount-service";
import { LoyaltyDiscount } from "@/lib/services/loyalty-service";
import { formatPhoneNumberForDisplay, formatPhoneNumber } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loyaltyDiscounts, setLoyaltyDiscounts] = useState<LoyaltyDiscount[]>(
    []
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const fetchCustomerData = async () => {
      try {
        // Always prioritize Appwrite Auth User details
        setFormData({
          full_name: user.name || "",
          phone: user.phone ? formatPhoneNumberForDisplay(user.phone) : "",
          email: user.email || "",
        });

        // Fetch loyalty discounts for this customer
        const response = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal("user_id", user.$id)] });

        if (response.rows.length > 0) {
          const customerData = response.rows[0];
          await fetchLoyaltyDiscounts(customerData.$id);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
        toast.error("Failed to load profile data");
      }
    };

    const fetchLoyaltyDiscounts = async (customerId: string) => {
      try {
        const discounts = await DiscountService.getCustomerActiveDiscountCodes(
          customerId
        );
        setLoyaltyDiscounts(discounts);
      } catch (error) {
        console.error("Error fetching loyalty discounts:", error);
      }
    };

    fetchCustomerData();
  }, [user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const copyToClipboard = async (discountCode: string) => {
    try {
      await navigator.clipboard.writeText(discountCode);
      setCopiedCode(discountCode);
      toast.success("Discount code copied to clipboard!");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error("Failed to copy discount code");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!password) {
      toast.error("Please enter your password to save changes");
      return;
    }

    setLoading(true);
    let updateErrors: string[] = [];

    try {
      // Update user name in Appwrite Auth
      if (formData.full_name !== user.name) {
        try {
          await account.updateName(formData.full_name);
        } catch (error: any) {
          console.error("Error updating name:", error);
          updateErrors.push(`Name update failed: ${error.message}`);
        }
      }


      let phoneUpdateSuccess = true;

      // Update phone number in Appwrite Auth
      if (formData.phone && formData.phone !== user.phone) {
        try {
          // Use robust formatting from utils
          const formattedPhone = formatPhoneNumber(formData.phone);

          if (formattedPhone !== user.phone) {
            await account.updatePhone(formattedPhone, password);
          }
        } catch (error: any) {
          // Ignore "A target with the same ID already exists." error (Code 409)
          if (
            error.code === 409 &&
            error.message?.includes("target with the same ID")
          ) {
            console.warn("Target conflict ignored for phone update");
          } else {
            console.error("Error updating phone:", error);
            updateErrors.push(`Phone update failed: ${error.message}`);
            phoneUpdateSuccess = false;
          }
        }
      }

      // If there were critical Auth errors (not target conflicts), we might want to stop or warn
      // But typically we want to try to keep the Customer record in sync even if Auth had minor hiccups

      // Find the customer document
      const response = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, queries: [Query.equal("user_id", user.$id)] });

      // Prepare formatted phone for Customer record
      const customerPhone = formatPhoneNumber(formData.phone);
      // If Auth update failed, revert to original user phone to prevent inconsistency
      // If user.phone is undefined (unlikely for logged in user), fallback to customerPhone but that implies we trust the input.
      const dbPhone = phoneUpdateSuccess ? customerPhone : (user.phone || customerPhone);


      if (response.rows.length === 0) {
        // Customer record not found - create new one
        console.log("Customer record not found, creating new one...");

        await tablesDB.createRow({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, rowId: ID.unique(), data: {
                        user_id: user.$id,
                        full_name: formData.full_name,
                        email: formData.email,
                        phone: dbPhone
                      } });

        toast.success("Profile updated and synchronized successfully!");
      } else {
        // Existing customer found - update it
        const customerId = response.rows[0].$id;

        await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID, rowId: customerId, data: {
                        full_name: formData.full_name,
                        phone: dbPhone, // Only update if Auth succeeded
                        email: formData.email,
                      } });

        if (updateErrors.length > 0) {
          toast.success("Profile saved (with some restrictions)");
        } else {
          toast.success("Profile updated successfully!");
        }
      }

      setIsEditing(false);
      setPassword("");
      await checkAuth();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-[#27247b]" />
          </button>
        </Link>
        <h1 className="text-3xl font-bold text-[#27247b]">My Profile</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <p className="text-lg text-gray-900">{formData.full_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-lg text-gray-900">{formData.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <p className="text-lg text-gray-900">
                  {formData.phone || "Not provided"}
                </p>
              </div>

              <Button
                onClick={() => setIsEditing(true)}
                className="w-full bg-[#27247b] hover:bg-[#27247b]/90 text-white"
              >
                Edit Profile
              </Button>
            </div>
          ) : (
            <form className="space-y-4">
              <Input
                label="Full Name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                placeholder="Email cannot be changed"
              />

              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
              />

              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  Enter your password to confirm changes
                </p>

                <div className="space-y-1">
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />

                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-[#27247b] hover:underline block text-right"
                    onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                      e.stopPropagation(); // Prevent the form from submitting
                      setIsEditing(false); // Close the edit mode
                    }}
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-[#27247b] hover:bg-[#27247b]/90 text-white"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setPassword("");
                  }}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Loyalty Discounts Section */}
      {process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === 'true' && loyaltyDiscounts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#27247b]" />
              Your Loyalty Discounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loyaltyDiscounts.map((discount) => (
              <div
                key={discount.$id}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-lg text-[#27247b]">
                      {discount.discount_percentage}% OFF
                    </p>
                    <p className="text-sm text-gray-600">
                      One-time use discount code
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Generated:{" "}
                      {new Date(
                        discount.code_generated_at
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 bg-white border rounded px-3 py-2 font-mono text-sm">
                    {discount.discount_code}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(discount.discount_code)}
                    className="flex items-center gap-1"
                  >
                    {copiedCode === discount.discount_code ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedCode === discount.discount_code ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

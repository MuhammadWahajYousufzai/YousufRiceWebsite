"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { Mail, Phone, MapPin, Send, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import Link from "next/link";

export default function ContactPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to send a message");
      return;
    }

    if (!formData.subject || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: user.name || "User",
        email: user.email,
        phone: user.phone || "",
        subject: formData.subject,
        message: formData.message,
      };

      const response = await fetch("/api/send-contact-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Message sent successfully! We'll get back to you soon.");
        setFormData({
          subject: "",
          message: "",
        });
      } else {
        toast.error(data.error || "Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Contact form error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#27247b] mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have a question or need assistance? We're here to help!
          </p>
        </div>

        {/* Get in Touch Section - Full Width */}
        <Card className="border-2 border-gray-200 shadow-xl rounded-2xl overflow-hidden mb-8">
          <CardHeader className="bg-linear-to-r from-[#ffff03] to-[#ffff03]/90 p-6">
            <CardTitle className="text-2xl font-bold text-[#27247b] text-center">
              Get in Touch
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Email */}
              <div className="flex flex-col items-center text-center">
                <div className="bg-[#27247b] p-3 rounded-lg mb-3">
                  <Mail className="w-6 h-6 text-[#ffff03]" />
                </div>
                <h3 className="font-bold text-[#27247b] mb-1">Email</h3>
                <a
                  href="mailto:support@yousufrice.com"
                  className="text-gray-600 hover:text-[#27247b] transition-colors"
                >
                  support@yousufrice.com
                </a>
              </div>

              {/* Phone */}
              <div className="flex flex-col items-center text-center">
                <div className="bg-[#27247b] p-3 rounded-lg mb-3">
                  <Phone className="w-6 h-6 text-[#ffff03]" />
                </div>
                <h3 className="font-bold text-[#27247b] mb-1">Phone</h3>
                <a
                  href="tel:+923332339557"
                  className="text-gray-600 hover:text-[#27247b] transition-colors"
                >
                  +923332339557
                </a>
              </div>

              {/* Location */}
              <div className="flex flex-col items-center text-center">
                <div className="bg-[#27247b] p-3 rounded-lg mb-3">
                  <MapPin className="w-6 h-6 text-[#ffff03]" />
                </div>
                <h3 className="font-bold text-[#27247b] mb-1">Location</h3>
                <p className="text-gray-600">Karachi, Pakistan</p>
                <p className="mt-1 text-sm font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full inline-block">
                  Free delivery in Karachi only
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Two Sections */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Section - Contact Form */}
          <div className="flex-1">
            {/* Contact Form */}
            <Card className="border-2 border-gray-200 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-linear-to-r from-[#27247b] to-[#27247b]/90 text-white p-6">
                <CardTitle className="text-2xl text-white font-bold flex items-center">
                  <Send className="w-6 h-6 mr-3" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!user ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 p-4 rounded-full inline-block mb-4">
                      <Lock className="w-8 h-8 text-[#27247b]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#27247b] mb-2">
                      Login Required
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Please log in to send us a message. This helps us serve you
                      better and keep track of your inquiries.
                    </p>
                    <Link href="/auth/login">
                      <Button className="bg-[#ffff03] text-[#27247b] hover:bg-[#ffff03]/90 font-bold px-8 py-2 text-lg">
                        Login to Contact Us
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-[#27247b] mb-2">
                        Subject *
                      </label>
                      <Input
                        value={formData.subject}
                        onChange={(e) =>
                          setFormData({ ...formData, subject: e.target.value })
                        }
                        required
                        className="border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base"
                        placeholder="What is this regarding?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#27247b] mb-2">
                        Message *
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        required
                        rows={5}
                        className="w-full border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base resize-none"
                        placeholder="Tell us how we can help you..."
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-linear-to-r from-[#27247b] to-[#27247b]/90 hover:from-[#27247b]/90 hover:to-[#27247b] text-white font-bold py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-[#ffff03]"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-[#27247b] text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#27247b] mb-2 text-lg">
                  Where do you deliver?
                </h3>
                <p className="text-gray-600">
                  We currently offer{" "}
                  <strong>free delivery in Karachi only</strong>. Our delivery
                  team ensures your order reaches you fresh and on time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#27247b] mb-2 text-lg">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600">
                  We currently accept Cash on Delivery (COD). Pay when you
                  receive your order.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#27247b] mb-2 text-lg">
                  How can I get quick answers?
                </h3>
                <p className="text-gray-600">
                  Our customer support team is available anytime through the
                  chat on YousufRice.com. You can place orders, ask about
                  product details, pricing, delivery, or track your existing
                  orders — just click the chat icon on our website!
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <h3 className="font-bold text-[#27247b] mb-2 text-lg">
                  Do you offer Special discounts?
                </h3>
                <p className="text-gray-600">
                  Buy more, save more! We offer special discounts on 2-4 kg, 5-9
                  kg, and 10 kg+ orders. For restaurants, we provide
                  premium-quality rice at the best prices when you purchase at
                  least one 25 kg bag. Chat with us to know your exact savings.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

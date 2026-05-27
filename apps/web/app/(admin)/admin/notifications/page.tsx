"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Bell,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    errors?: string[];
  } | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    count: number;
    endpoints: string[];
  } | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to send");
      }

      setResult(data);
      if (data.sent > 0) {
        toast.success(`Sent to ${data.sent} subscribers!`);
      } else {
        toast.error("No notifications delivered — check diagnostics below");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const testLocalNotification = () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this browser");
      return;
    }
    if (Notification.permission !== "granted") {
      toast.error("Notification permission denied. Check browser settings.");
      return;
    }
    try {
      new Notification("Test Notification", {
        body: "If you see this, your browser/OS allows notifications.",
        icon: "/icon-192x192.png",
        requireInteraction: true,
        tag: "test-local",
      });
      toast.success("Local notification sent! Did you see it?");
    } catch (err: any) {
      toast.error("Local notification failed: " + err.message);
    }
  };

  const loadDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      const res = await fetch("/api/push/send");
      const data = await res.json();
      setDiagnostics(data);
    } catch {
      toast.error("Failed to load diagnostics");
    } finally {
      setLoadingDiag(false);
    }
  };

  return (
    <AdminAuthGuard>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Send Push Notification
          </h1>
          <p className="text-gray-600">
            Send a notification to all subscribed users instantly.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ramadan Special Offer!"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Body *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter your notification message..."
                  maxLength={300}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{body.length}/300</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target URL
                </label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/offers or https://..."
                />
              </div>

              <Button
                type="submit"
                disabled={sending || !title.trim() || !body.trim()}
                size="lg"
                className="w-full"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </form>

            {result && (
              <div
                className={`mt-6 p-4 rounded-lg border ${result.sent === 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {result.sent === 0 ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  <span
                    className={`font-medium ${result.sent === 0 ? "text-red-800" : "text-green-800"}`}
                  >
                    {result.sent === 0
                      ? "No notifications delivered"
                      : "Notification sent successfully"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.total}
                    </p>
                    <p className="text-xs text-gray-500">Subscribers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {result.sent}
                    </p>
                    <p className="text-xs text-gray-500">Sent</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {result.failed}
                    </p>
                    <p className="text-xs text-gray-500">Failed</p>
                  </div>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-red-700 mb-1">
                      Errors:
                    </p>
                    <ul className="text-xs text-red-600 space-y-1 bg-red-50 p-2 rounded max-h-40 overflow-auto">
                      {result.errors.map((err, i) => (
                        <li key={i} className="font-mono">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnostics */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Diagnostics
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testLocalNotification}
                >
                  <Bell className="w-4 h-4 mr-1" />
                  Test Local
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDiagnostics}
                  disabled={loadingDiag}
                >
                  {loadingDiag ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </div>
            {diagnostics ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">{diagnostics.count}</span>{" "}
                  active subscription(s)
                </p>
                {diagnostics.endpoints.length > 0 && (
                  <div className="bg-gray-50 rounded p-3 max-h-48 overflow-auto">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Endpoints:
                    </p>
                    {diagnostics.endpoints.map((ep, i) => (
                      <p
                        key={i}
                        className="text-xs font-mono text-gray-700 break-all"
                      >
                        {ep}...
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Click Refresh to see active subscriptions
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminAuthGuard>
  );
}

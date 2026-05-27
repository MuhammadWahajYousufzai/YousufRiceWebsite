'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, AdminPermission } from '@/lib/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import ReadOnlyGuard from '@/components/admin/ReadOnlyGuard';
import { ShieldCheck, ShieldAlert, ShieldX, User } from 'lucide-react';

export default function AdminTestPage() {
  const { user, adminPermission, hasReadPermission, hasWritePermission } = useAuthStore();
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchApiData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setApiData(data);
    } catch (error) {
      console.error('Error fetching API data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-6">Admin Authentication Test</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">User ID</p>
                  <p className="font-medium">{user?.$id || 'Not authenticated'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Labels</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {user?.labels?.map((label: string) => (
                      <span
                        key={label}
                        className={`px-2 py-1 text-xs font-medium rounded-full ${label === 'admin' ? 'bg-green-100 text-green-800' :
                            label === 'readonly' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {label}
                      </span>
                    ))}
                    {!user?.labels?.length && <span className="text-gray-500">No labels</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Permission Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {adminPermission === AdminPermission.FULL_ACCESS ? (
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                  ) : adminPermission === AdminPermission.READ_ONLY ? (
                    <ShieldAlert className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ShieldX className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {adminPermission === AdminPermission.FULL_ACCESS ? 'Full Admin Access' :
                        adminPermission === AdminPermission.READ_ONLY ? 'Read-Only Access' :
                          'No Admin Access'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {adminPermission === AdminPermission.FULL_ACCESS ? 'You can view and modify all admin data' :
                        adminPermission === AdminPermission.READ_ONLY ? 'You can view but not modify admin data' :
                          'You cannot access admin data'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-500 mb-1">Read Permission</p>
                    <p className={`font-medium ${hasReadPermission() ? 'text-green-600' : 'text-red-600'}`}>
                      {hasReadPermission() ? 'Granted' : 'Denied'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-500 mb-1">Write Permission</p>
                    <p className={`font-medium ${hasWritePermission() ? 'text-green-600' : 'text-red-600'}`}>
                      {hasWritePermission() ? 'Granted' : 'Denied'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Permission Test Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Read-Only Action</h3>
                <p className="text-gray-600 mb-3">This action requires read-only access (admin or readonly label)</p>
                <Button onClick={fetchApiData} disabled={loading || !hasReadPermission()}>
                  {loading ? 'Loading...' : 'Fetch Admin Stats'}
                </Button>

                {apiData && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(apiData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Write Action</h3>
                <p className="text-gray-600 mb-3">This action requires full admin access (admin label)</p>
                <ReadOnlyGuard>
                  <Button variant="destructive">
                    Delete Something (Simulated)
                  </Button>
                </ReadOnlyGuard>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminAuthGuard>
  );
}

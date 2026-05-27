'use client';

import { ReactNode } from 'react';
import { useAuthStore, AdminPermission } from '@/lib/store/auth-store';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { Sidebar } from '@/components/admin/Sidebar';
import { ShieldAlert } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { adminPermission } = useAuthStore();
  const isReadOnly = adminPermission === AdminPermission.READ_ONLY;
  
  return (
    <AdminAuthGuard requiredPermission={AdminPermission.READ_ONLY}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-gray-50 relative">
          {isReadOnly && (
            <div className="sticky top-0 w-full bg-amber-50 border-b border-amber-200 p-2 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                  Read-Only Mode: You can view all data but cannot make any changes
                </p>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </AdminAuthGuard>
  );
}

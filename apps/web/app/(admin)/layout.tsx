'use client';

import { ReactNode } from 'react';
import { useAuthStore, AdminPermission } from '@/lib/store/auth-store';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { Sidebar } from '@/components/admin/Sidebar';
import { ShieldAlert } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  orderModal: ReactNode;
}

export default function AdminLayout({ children, orderModal }: AdminLayoutProps) {
  const { adminPermission } = useAuthStore();
  const isReadOnly = adminPermission === AdminPermission.READ_ONLY;
  
  return (
    <AdminAuthGuard requiredPermission={AdminPermission.READ_ONLY}>
      <div className="flex min-h-screen flex-col overflow-x-hidden md:flex-row">
        <Sidebar />
        <div className="relative min-w-0 flex-1 bg-gray-50">
          {isReadOnly && (
            <div className="sticky top-0 w-full bg-amber-50 border-b border-amber-200 p-2 z-50">
              <div className="mx-auto flex max-w-7xl items-start gap-2 px-3 sm:px-6 lg:px-8">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                  Read-Only Mode: You can view all data but cannot make any changes
                </p>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
      {orderModal}
    </AdminAuthGuard>
  );
}

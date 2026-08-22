'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users,
  UserSearchIcon,
  LogOut, 
  ShieldCheck,
  Home,
  Bell,
  Megaphone
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { adminPermission, logout } = useAuthStore();
  
  const isActive = (path: string) => {
    return path === '/admin' ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
  };
  
  const allNavItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      name: 'Products',
      href: '/admin/products',
      icon: Package,
      adminOnly: false,
    },
    {
      name: 'Promotions',
      href: '/admin/promotions',
      icon: Megaphone,
      adminOnly: true,
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: ShoppingBag,
      adminOnly: false,
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: Users,
      adminOnly: false,
    },
    {
      name: 'Auth Test',
      href: '/admin/test',
      icon: ShieldCheck,
      adminOnly: false,
    },
    {
      name: 'Staff Performance',
      href: '/admin/staff-performance',
      icon: UserSearchIcon,
      adminOnly: false,
    },
    {
      name: 'Notifications',
      href: '/admin/notifications',
      icon: Bell,
      adminOnly: true,
    },
  ];

  // Filter nav items: readonly users cannot see admin-only pages
  const navItems = allNavItems.filter((item) => {
    if (!item.adminOnly) return true;
    return adminPermission === 'admin';
  });

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-3 md:block md:p-4">
        <Link href="/admin" className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 shrink-0 text-blue-600" />
          <span className="text-lg font-bold md:text-xl">Control Panel</span>
        </Link>
        <div className="md:mt-2">
          <span className={cn(
            "whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium",
            adminPermission === 'admin' ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
          )}>
            {adminPermission === 'admin' ? 'Full Access' : 'Read Only'}
          </span>
        </div>
      </div>
      
      <nav className="flex gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col md:gap-0 md:space-y-1 md:overflow-visible md:p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium transition-colors md:shrink",
              isActive(item.href)
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <item.icon className="mr-2 h-5 w-5 shrink-0 md:mr-3" />
            <span className="whitespace-nowrap">{item.name}</span>
          </Link>
        ))}
      </nav>
      
      <div className="flex gap-2 border-t border-gray-200 p-3 md:block md:space-y-2 md:p-4">
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 md:w-full"
        >
          <Home className="mr-2 h-5 w-5 shrink-0 md:mr-3" />
          Back to Site
        </Link>
        <button
          onClick={() => logout()}
          className="flex shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 md:w-full"
        >
          <LogOut className="mr-2 h-5 w-5 shrink-0 md:mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
}

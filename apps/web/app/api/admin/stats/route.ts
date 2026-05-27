import { NextRequest, NextResponse } from 'next/server';
import { tablesDB, DATABASE_ID, ORDERS_TABLE_ID, PRODUCTS_TABLE_ID, CUSTOMERS_TABLE_ID } from "@/lib/appwrite";
import { Query } from 'appwrite';
import { checkAdminPermissions } from '@/lib/auth-utils';

// Note: We can't use dynamic = 'force-dynamic' with cacheComponents enabled

// Detect if we're in a build environment
const isBuildTime = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';
};

// Dummy data for build-time errors
const dummyStats = {
  totalOrders: 0,
  totalRevenue: 0,
  totalProducts: 0,
  totalCustomers: 0,
  pendingOrders: 0,
  acceptedOrders: 0,
  outForDeliveryOrders: 0,
  deliveredOrders: 0,
  availableProducts: 0,
  lowStockProducts: 0,
  revenueGrowth: 0,
  ordersGrowth: 0
};

/**
 * API route to get admin dashboard statistics
 * Protected by admin auth utility (read-only access is sufficient)
 */
export async function GET(req: NextRequest) {
  // During build time, return dummy data to avoid authentication errors
  if (isBuildTime()) {
    console.log('Build-time detected, returning dummy stats');
    return NextResponse.json({
      stats: {
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        totalCustomers: 0,
        pendingOrders: 0,
        acceptedOrders: 0,
        outForDeliveryOrders: 0,
        deliveredOrders: 0,
        availableProducts: 0,
        lowStockProducts: 0,
        revenueGrowth: 0,
        ordersGrowth: 0
      }
    });
  }
  
  try {
    // Check admin permissions (read-only is sufficient)
    const authError = await checkAdminPermissions(req, false);
    if (authError) {
      return authError;
    }
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      ordersRes,
      productsRes,
      customersRes,
      pendingRes,
      acceptedRes,
      outForDeliveryRes,
      deliveredRes,
      lastMonthOrdersRes
    ] = await Promise.all([
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: PRODUCTS_TABLE_ID }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: CUSTOMERS_TABLE_ID }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: [Query.equal('status', 'pending')] }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: [Query.equal('status', 'accepted')] }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: [Query.equal('status', 'out_for_delivery')] }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: [Query.equal('status', 'delivered')] }),
      tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, queries: [Query.greaterThan('$createdAt', thirtyDaysAgo.toISOString())] })
    ]);

    const totalRevenue = ordersRes.rows.reduce((sum: number, order: any) => {
      return sum + (order.total_price || 0);
    }, 0);

    const lastMonthRevenue = lastMonthOrdersRes.rows.reduce((sum: number, order: any) => {
      return sum + (order.total_price || 0);
    }, 0);

    const previousRevenue = totalRevenue - lastMonthRevenue;
    const revenueGrowth = previousRevenue > 0 ? ((lastMonthRevenue / previousRevenue) * 100 - 100) : 0;
    const ordersGrowth = ordersRes.total > 0 ? ((lastMonthOrdersRes.total / ordersRes.total) * 100) : 0;

    const availableProducts = (productsRes.rows as any[]).filter((p: any) => p.available).length;

    return NextResponse.json({
      stats: {
        totalOrders: ordersRes.total,
        totalRevenue,
        totalProducts: productsRes.total,
        totalCustomers: customersRes.total,
        pendingOrders: pendingRes.total,
        acceptedOrders: acceptedRes.total,
        outForDeliveryOrders: outForDeliveryRes.total,
        deliveredOrders: deliveredRes.total,
        availableProducts,
        lowStockProducts: 0,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        ordersGrowth: Math.round(ordersGrowth * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    
    // During build time or when auth fails, return dummy data
    if (process.env.NODE_ENV === 'production' && (error as Error).toString().includes('Failed to fetch')) {
      console.log('Returning dummy data during build');
      return NextResponse.json({ stats: dummyStats });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}

// No middleware needed - we check permissions directly in the handler

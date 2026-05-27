// Updated TypeScript types for improved database schema

export interface Product {
  $id: string;
  name: string;
  description?: string;
  base_price_per_kg: number;
  has_tier_pricing: boolean;
  tier_2_4kg_price?: number;
  tier_5_9kg_price?: number;
  tier_10kg_up_price?: number;
  available: boolean;
  primary_image_id?: string;
  $createdAt: string;
}

export interface ProductImage {
  $id: string;
  product_id: string;
  file_id: string;
  is_primary: boolean;
  $createdAt: string;
}

// NEW: Proper Order Item structure
export interface OrderItem {
  $id: string;
  order_id: string;
  product_id: string;

  // Product snapshot (prevents data loss if product is deleted/modified)
  product_name: string;
  product_description?: string;

  // Quantity information
  quantity_kg: number;

  // Bag breakdown for inventory tracking
  bags_3kg: number;
  bags_5kg: number;
  bags_10kg: number;
  bags_25kg: number;

  // Price information at time of order (CRITICAL for price integrity)
  price_per_kg_at_order: number;
  base_price_per_kg: number;

  // Tier pricing snapshot
  tier_applied: "base" | "2-4kg" | "5-9kg" | "10kg+";


  // Discount information
  discount_percentage: number;
  discount_amount: number;

  // Calculated totals
  subtotal_before_discount: number;
  total_after_discount: number;

  // Additional metadata
  notes?: string;

  $createdAt: string;
}

// Updated Order interface
export interface Order {
  $id: string;
  customer_id: string;
  address_id: string;

  // Summary fields (calculated from OrderItems)
  total_items_count: number;
  total_weight_kg: number;
  subtotal_before_discount: number;
  total_discount_amount: number;
  total_price: number; // final total after all discounts

  status:
    | "pending"
    | "accepted"
    | "out_for_delivery"
    | "delivered"
    | "returned";
  $createdAt: string;

  // Navigation properties (not stored in DB, populated by queries)
  items?: OrderItem[];
  customer?: Customer;
  address?: Address;
}

export interface Customer {
  $id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email?: string;
  $createdAt: string;
}

export interface Address {
  $id: string;
  customer_id: string;
  order_id: string;
  address_line: string;
  city: string;
  latitude: number;
  longitude: number;
  maps_url: string;
  $createdAt: string;
}

// Updated Cart Item structure
export interface CartItem {
  product: Product;
  quantity: number; // in kg (calculated from bags)
  bags: {
    kg3: number; // count of 3kg bags
    kg5: number; // count of 5kg bags
    kg10: number; // count of 10kg bags
    kg25: number; // count of 25kg bags
  };

  // Price calculation (live, not stored)
  pricePerKg?: number;
  subtotal?: number;
  appliedTier?: "base" | "2-4kg" | "5-9kg" | "10kg+";

  // Discount (if any)
  discount?: {
    percentage: number;
    amount: number;
    reason: string;
  };
}

// For order creation
export interface CreateOrderItemRequest {
  product_id: string;
  quantity_kg: number;
  bags: {
    kg3: number;
    kg5: number;
    kg10: number;
    kg25: number;
  };
  discount?: {
    percentage: number;
    reason: string;
  };
  notes?: string;
  is_custom_price?: boolean;
  custom_price_per_kg?: number;
}

export interface CreateOrderRequest {
  customer_id: string;
  items: CreateOrderItemRequest[];
  address: {
    address_line: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

// For order display with full details
export interface OrderWithDetails extends Order {
  items: OrderItem[];
  customer: Customer;
  address: Address;
}

// Discount types
export interface Discount {
  $id: string;
  code?: string; // promo code
  type: "percentage" | "fixed_amount" | "bulk_discount";
  value: number;
  min_quantity?: number;
  min_amount?: number;
  max_discount?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  usage_limit?: number;
  used_count: number;
  description: string;
  $createdAt: string;
}

// Analytics and reporting types
export interface OrderAnalytics {
  total_orders: number;
  total_revenue: number;
  total_weight_sold: number;
  average_order_value: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  revenue_by_month: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

export interface InventoryReport {
  product_id: string;
  product_name: string;
  total_ordered: number;
  orders_count: number;
  revenue: number;
  avg_price_per_kg: number;
  last_ordered: string;
}

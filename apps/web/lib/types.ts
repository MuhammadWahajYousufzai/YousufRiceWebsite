import type { Addresses } from "../types/appwrite";

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
  is_cold_drink_bundle?: boolean;
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
  tier_applied?: string; // 'base', '2-4kg', '5-9kg', '10kg+'

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

  // Legacy CSV field (kept for backward compatibility during migration)
  order_items?: string;

  // Summary fields (calculated from OrderItems)
  total_items_count?: number;
  total_weight_kg?: number;
  subtotal_before_discount?: number;
  total_discount_amount?: number;
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

export type Address = Addresses;

export interface CartItem {
  product: Product;
  quantity: number; // in kg (calculated from bags)
  bags: {
    kg3: number; // count of 3kg bags
    kg5: number; // count of 5kg bags
    kg10: number; // count of 10kg bags
    kg25: number; // count of 25kg bags
  };
  isColdDrinkBundle?: boolean;
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
  address?: Address;
}

export interface NotificationCampaign {
  $id: string;
  title: string;
  body: string;
  image_url?: string;
  target_url?: string;
  icon_url?: string;
  badge_url?: string;
  tag?: string;
  campaign_type: 'push' | 'in-app' | 'both';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  is_active: boolean;
  sent_count: number;
  clicked_count: number;
  failed_count: number;
  delivered_count: number;
  dismissed_count: number;
  scheduled_at?: string;
  sent_at?: string;
  created_by?: string;
  target_segment: 'all' | 'active_users' | 'inactive_users' | 'custom';
  target_tags?: string[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
  require_interaction: boolean;
  $createdAt: string;
}

export interface NotificationCampaignAnalytics {
  $id: string;
  campaign_id: string;
  subscription_id: string;
  event_type: 'sent' | 'delivered' | 'clicked' | 'dismissed' | 'failed';
  user_agent?: string;
  ip_address?: string;
  clicked_url?: string;
  error_code?: number;
  error_message?: string;
  event_at?: string;
  $createdAt: string;
}

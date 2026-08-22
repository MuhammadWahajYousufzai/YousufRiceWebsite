export type OrderStatus =
  | "pending"
  | "accepted"
  | "out_for_delivery"
  | "delivered"
  | "returned";

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
  order_id?: string;
  address_line: string;
  city?: string;
  latitude: number;
  longitude: number;
  maps_url?: string;
  $createdAt: string;
}

export interface OrderItem {
  $id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_description?: string;
  quantity_kg: number;
  bags_3kg: number;
  bags_5kg: number;
  bags_10kg: number;
  bags_25kg: number;
  price_per_kg_at_order: number;
  base_price_per_kg: number;
  tier_applied?: "base" | "2-4kg" | "5-9kg" | "10kg+";
  discount_percentage: number;
  discount_amount: number;
  subtotal_before_discount: number;
  total_after_discount: number;
  notes?: string;
  $createdAt: string;
}

export interface Order {
  $id: string;
  customer_id: string;
  address_id: string;
  order_items?: string;
  total_items_count?: number;
  total_weight_kg?: number;
  subtotal_before_discount?: number;
  total_discount_amount?: number;
  total_price: number;
  status: OrderStatus;
  $createdAt: string;
  items?: OrderItem[];
  customer?: Customer;
  address?: Address;
}

export interface CartItem {
  product: Product;
  quantity: number;
  bags: {
    kg3: number;
    kg5: number;
    kg10: number;
    kg25: number;
  };
  isColdDrinkBundle?: boolean;
}

export type StorefrontPlacement = "promotion" | "announcement";

export type StorefrontTheme =
  | "harvest"
  | "midnight"
  | "saffron"
  | "emerald"
  | "rose";

export type StorefrontVisualStyle =
  | "product_focus"
  | "split"
  | "minimal";

export interface StorefrontContent {
  $id: string;
  placement: StorefrontPlacement;
  enabled: boolean;
  title: string;
  description?: string;
  badge_text?: string;
  cta_text?: string;
  cta_url?: string;
  product_id?: string;
  theme: StorefrontTheme;
  visual_style: StorefrontVisualStyle;
  sort_order: number;
  show_on_web: boolean;
  show_on_mobile: boolean;
  show_product_price: boolean;
  qualifying_bag_size_kg?: number;
  reward_text?: string;
  reward_quantity?: number;
  starts_at?: string;
  ends_at?: string;
  $createdAt: string;
  $updatedAt: string;
}

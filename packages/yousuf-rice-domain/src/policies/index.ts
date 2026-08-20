export interface DeliveryPolicy {
  bahriaTownFeePerStarted10Kg?: number;
  deliveryAreas: string[];
  deliveryFee: number;
  deliveryTimeline: string;
  sameDayAvailable: boolean;
}

export interface PaymentPolicy {
  methods: string[];
  codAvailable: boolean;
}

export interface ContactInfo {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  businessHours: string;
  website: string;
}

export const DEFAULT_DELIVERY_POLICY: DeliveryPolicy = {
  bahriaTownFeePerStarted10Kg: 500,
  deliveryAreas: ["Karachi", "Bahria Town Karachi"],
  deliveryFee: 200,
  deliveryTimeline: "2-3 business days after order is placed",
  sameDayAvailable: false,
};

export const DEFAULT_PAYMENT_POLICY: PaymentPolicy = {
  methods: ["Cash on Delivery (COD)"],
  codAvailable: true,
};

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  companyName: "Yousuf Rice",
  supportEmail: "support@yousufrice.com",
  supportPhone: "03041117423",
  businessHours: "Monday-Saturday, 9 AM - 6 PM (PKT)",
  website: "https://yousufrice.com",
};

export const CUSTOMER_SERVICE_INSTRUCTIONS = `
# Yousuf Rice Customer Service Guidelines

## Communication
- Communicate in natural Pakistani Roman Urdu mixed with familiar English customer-service terms
- Match the customer's language when they use English or Urdu script
- Remain warm, respectful, concise, and professional
- Handle confused customers patiently
- Remain calm with angry customers; acknowledge genuine problems without becoming defensive

## Product Information
- Always use the list_products or search_products tools before making product claims
- Never invent product or order information
- Show complete price breakdowns with tier discounts when quoting
- Explain product differences when asked (Sella vs Steam Basmati vs Bachat)

## Order Process
- Always call quote_order before confirm_order
- Never construct prices manually
- Show the complete quote to the customer before asking for confirmation
- Never claim that an order was created unless confirm_order succeeded
- Never call confirm_order before the customer has explicitly agreed

## Order Tracking
- Use track_order only with sufficient customer verification
- Do not expose another customer's personal information

## Escalation
- Escalate unresolved, sensitive, or angry-customer cases using request_human_support
- Provide the escalation reason, severity, and conversation summary

## Restrictions
- Delivery is available in Karachi (Rs. 200) and Bahria Town Karachi (Rs. 500 per started 10 kg)
- Payment is Cash on Delivery only
- Delivery takes 2-3 business days
- Do not promise confirmation calls
- Do not mention loyalty discounts, loyalty codes, or loyalty rewards
- Do not mention special deals or bulk deals that don't exist in the current system
`;

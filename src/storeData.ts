export type RegionCode = "LB" | "FR" | "DE";

export interface RegionInfo {
  code: RegionCode;
  name: string;
  flag: string;
  currency: "USD" | "EUR";
  symbol: "$" | "€";
  paymentLabel: string;
  deliveryFee: number;
  freeDeliveryOver: number;
}

export const REGIONS: Record<RegionCode, RegionInfo> = {
  LB: {
    code: "LB",
    name: "Lebanon",
    flag: "🇱🇧",
    currency: "USD",
    symbol: "$",
    paymentLabel: "Cash on Delivery (COD)",
    deliveryFee: 4,
    freeDeliveryOver: 45,
  },
  FR: {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    currency: "EUR",
    symbol: "€",
    paymentLabel: "Standard EU Delivery",
    deliveryFee: 6,
    freeDeliveryOver: 60,
  },
  DE: {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    currency: "EUR",
    symbol: "€",
    paymentLabel: "Standard EU Delivery",
    deliveryFee: 6,
    freeDeliveryOver: 60,
  },
};

export const ADMIN_CATEGORIES = [
  "Kitchenware",
  "Detergents",
  "Deodorants",
  "Skincare",
  "Stationery",
  "Home Decor",
  "Bath & Body",
  "Cleaning Tools",
  "Storage & Organization",
  "Electronics & Accessories",
  "Baby & Kids",
  "Gifts & Lifestyle",
] as const;

export type ProductCategory = (typeof ADMIN_CATEGORIES)[number];

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price_lb: number;
  price_eu: number;
  image_url: string;
  regions: RegionCode[];
  badge?: string;
  in_stock: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface StoreOrder {
  id: string;
  created_at: string;
  region: RegionCode;
  currency: string;
  customer_name: string;
  customer_phone: string;
  city: string;
  address: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: "pending" | "confirmed" | "delivered";
}

export function detectVisitorRegion(): RegionCode {
  if (typeof window === "undefined") return "LB";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const lang = navigator.language || "";
  if (tz.includes("Paris") || lang.toLowerCase() === "fr-fr") return "FR";
  if (tz.includes("Berlin") || lang.toLowerCase() === "de-de") return "DE";
  return "LB";
}

export const INITIAL_PRODUCTS: Product[] = [];

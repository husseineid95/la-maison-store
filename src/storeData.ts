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

export const CATEGORIES = [
  "All",
  "Kitchenware",
  "Detergents",
  "Deodorants",
  "Skincare",
  "Stationery",
] as const;

export type ProductCategory = Exclude<(typeof CATEGORIES)[number], "All">;

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
  const saved = localStorage.getItem("lamaison_region") as RegionCode | null;
  if (saved && saved in REGIONS) return saved;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (tz.includes("Paris")) return "FR";
  if (tz.includes("Berlin")) return "DE";
  return "LB";
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Ceramic Non-Stick Sauté Pan (28 cm)",
    category: "Kitchenware",
    description: "Heavy-gauge induction-ready aluminum body with smooth PFOA-free ceramic coating and stay-cool handle.",
    price_lb: 26,
    price_eu: 32,
    image_url: "https://unsplash.com",
    regions: ["LB", "FR", "DE"],
    badge: "Best Seller",
    in_stock: true,
  },
  {
    id: "prod-2",
    name: "Botanical Concentrated Laundry Liquid (2L)",
    category: "Detergents",
    description: "Deep-cleaning enzyme formula gentle on sensitive skin and fabrics, with fresh white-linen scent.",
    price_lb: 9.5,
    price_eu: 12,
    image_url: "https://unsplash.com",
    regions: ["LB"],
    badge: "Value Pack",
    in_stock: true,
  },
  {
    id: "prod-3",
    name: "Mineral & Shea Natural Deodorant Balm",
    category: "Deodorants",
    description: "48-hour odor protection powered by magnesium and organic shea butter. Aluminum-free, zero white marks.",
    price_lb: 7,
    price_eu: 11,
    image_url: "https://unsplash.com",
    regions: ["LB", "FR", "DE"],
    badge: "New",
    in_stock: true,
  },
  {
    id: "prod-4",
    name: "Hyaluronic & Niacinamide Daily Hydrating Serum",
    category: "Skincare",
    description: "Lightweight barrier-repairing serum that deeply hydrates, balances oil, and calms redness.",
    price_lb: 14,
    price_eu: 19,
    image_url: "https://unsplash.com",
    regions: ["LB", "FR", "DE"],
    badge: "Top Rated",
    in_stock: true,
  },
  {
    id: "prod-5",
    name: "Linen Hardcover Dotted Notebook & Brass Pen Set",
    category: "Stationery",
    description: "120gsm fountain-pen friendly cream paper with lay-flat binding and weighted smooth-gel pen.",
    price_lb: 11,
    price_eu: 15,
    image_url: "https://unsplash.com",
    regions: ["LB", "FR", "DE"],
    in_stock: true,
  },
  {
    id: "prod-6",
    name: "Airtight Borosilicate Glass Pantry Jar Set (3 pcs)",
    category: "Kitchenware",
    description: "Stackable crystal-clear storage jars with silicone-sealed acacia wood lids for coffee, spices, and grains.",
    price_lb: 18,
    price_eu: 24,
    image_url: "https://unsplash.com",
    regions: ["LB", "FR", "DE"],
    in_stock: true,
  },
];
  

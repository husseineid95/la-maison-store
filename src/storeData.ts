export type RegionCode = "LB" | "FR" | "DE";
export type LangCode = "en" | "ar" | "fr" | "de";

export interface LangInfo {
  code: LangCode;
  label: string;
  dir: "ltr" | "rtl";
}

export const LANGUAGES: Record<LangCode, LangInfo> = {
  en: { code: "en", label: "EN", dir: "ltr" },
  ar: { code: "ar", label: "عربي", dir: "rtl" },
  fr: { code: "fr", label: "FR", dir: "ltr" },
  de: { code: "de", label: "DE", dir: "ltr" },
};

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
  LB: { code: "LB", name: "Lebanon", flag: "🇱🇧", currency: "USD", symbol: "$", paymentLabel: "Cash on Delivery (COD)", deliveryFee: 4, freeDeliveryOver: 45 },
  FR: { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR", symbol: "€", paymentLabel: "Standard EU Delivery", deliveryFee: 6, freeDeliveryOver: 60 },
  DE: { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR", symbol: "€", paymentLabel: "Standard EU Delivery", deliveryFee: 6, freeDeliveryOver: 60 },
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

export interface LocalizedText {
  name?: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price_lb: number;
  price_eu: number;
  image_url: string;
  images?: string[];
  translations?: Partial<Record<LangCode, LocalizedText>>;
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

export function isVideoMedia(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("data:video/")) return true;
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);
}

export function getProductImages(p: Product): string[] {
  if (Array.isArray(p.images) && p.images.length > 0) return p.images.filter(Boolean);
  return p.image_url ? [p.image_url] : [];
}

export function getProductText(p: Product, lang: LangCode): { name: string; description: string } {
  if (lang === "en") return { name: p.name, description: p.description };
  const t = p.translations?.[lang];
  return {
    name: t?.name?.trim() || p.name,
    description: t?.description?.trim() || p.description,
  };
}

export function detectVisitorRegion(): RegionCode {
  if (typeof window === "undefined") return "LB";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const lang = navigator.language || "";
  if (tz.includes("Paris") || lang.toLowerCase() === "fr-fr") return "FR";
  if (tz.includes("Berlin") || lang.toLowerCase() === "de-de") return "DE";
  return "LB";
}

export function detectVisitorLang(): LangCode {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("lamaison_lang") as LangCode | null;
  if (saved && saved in LANGUAGES) return saved;
  const nav = (navigator.language || "").toLowerCase();
  if (nav.startsWith("ar")) return "ar";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("de")) return "de";
  return "en";
}

export const INITIAL_PRODUCTS: Product[] = [];

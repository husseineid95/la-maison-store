import { useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  ShieldCheck,
  Package,
  Bell,
  Edit3,
  Globe,
  MessageCircle,
  Lock,
  LogOut,
  Truck,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabase";
import {
  CATEGORIES,
  INITIAL_PRODUCTS,
  REGIONS,
  detectVisitorRegion,
  type Product,
  type ProductCategory,
  type RegionCode,
  type StoreOrder,
} from "./storeData";

const WHATSAPP_NUMBER = "96181428535";
const ADMIN_PASSCODE = "maison2026";

export default function App() {
  const [region, setRegion] = useState<RegionCode>(() => detectVisitorRegion());
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [adminTab, setAdminTab] = useState<"orders" | "products">("orders");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Checkout state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<StoreOrder | null>(null);

  // Admin product form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pName, setPName] = useState("");
  const [pCat, setPCat] = useState<ProductCategory>("Kitchenware");
  const [pDesc, setPDesc] = useState("");
  const [pPriceLb, setPPriceLb] = useState("");
  const [pPriceEu, setPPriceEu] = useState("");
  const [pImg, setPImg] = useState("");
  const [pBadge, setPBadge] = useState("");
  const [pRegions, setPRegions] = useState<RegionCode[]>(["LB"]);
  const [pInStock, setPInStock] = useState(true);

  const activeRegion = REGIONS[region];
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }

  // Load products & orders from Supabase (or localStorage fallback)
  useEffect(() => {
    async function loadStore() {
      if (isSupabaseConfigured && supabase) {
        const { data: prodData } = await supabase
          .from("store_products")
          .select("*")
          .order("created_at", { ascending: false });
        if (prodData && prodData.length > 0) {
          setProducts(prodData as Product[]);
        }
        const { data: orderData } = await supabase
          .from("store_orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (orderData) {
          setOrders(orderData as StoreOrder[]);
        }
      } else {
        const localProds = localStorage.getItem("lamaison_products");
        if (localProds) setProducts(JSON.parse(localProds));
        const localOrders = localStorage.getItem("lamaison_orders");
        if (localOrders) setOrders(JSON.parse(localOrders));
      }
    }
    void loadStore();
  }, []);

  // Real-time new order notification listener when Supabase is active
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const channel = supabase
      .channel("store-orders-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "store_orders" },
        (payload) => {
          const newOrder = payload.new as StoreOrder;
          setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
          showToast(`New order from ${newOrder.customer_name} (${newOrder.region})!`);
        }
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, []);

  function changeRegion(next: RegionCode) {
    setRegion(next);
    localStorage.setItem("lamaison_region", next);
    setCart({});
    setLastPlacedOrder(null);
  }

  function unitPrice(p: Product) {
    return region === "LB" ? Number(p.price_lb) : Number(p.price_eu);
  }

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.regions.includes(region)) return false;
      if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, region, selectedCategory, search]);
            

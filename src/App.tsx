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
  Image as ImageIcon,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabase";
import {
  ADMIN_CATEGORIES,
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

  useEffect(() => {
    async function loadStore() {
      if (isSupabaseConfigured && supabase) {
        const { data: prodData } = await supabase
          .from("store_products")
          .select("*")
          .order("created_at", { ascending: false });
        if (prodData) {
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

  // Admin-only country preview switcher
  function adminSwitchRegion(next: RegionCode) {
    setRegion(next);
    setSelectedCategory("All");
    setCart({});
    setLastPlacedOrder(null);
    showToast(`Previewing ${REGIONS[next].flag} ${REGIONS[next].name} storefront`);
  }

  function unitPrice(p: Product) {
    return region === "LB" ? Number(p.price_lb) : Number(p.price_eu);
  }

  const regionProducts = useMemo(() => {
    return products.filter((p) => p.regions.includes(region));
  }, [products, region]);

  // Dynamic categories: ONLY categories that currently have products in the active region
  const activeCategories = useMemo(() => {
    const present = new Set(regionProducts.map((p) => p.category));
    return ADMIN_CATEGORIES.filter((cat) => present.has(cat));
  }, [regionProducts]);

  const visibleProducts = useMemo(() => {
    return regionProducts.filter((p) => {
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
  }, [regionProducts, selectedCategory, search]);
    const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        if (!product || qty <= 0) return null;
        return { product, qty, price: unitPrice(product) };
      })
      .filter(Boolean) as { product: Product; qty: number; price: number }[];
  }, [cart, products, region]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee =
    subtotal === 0 || subtotal >= activeRegion.freeDeliveryOver ? 0 : activeRegion.deliveryFee;
  const total = subtotal + deliveryFee;
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    showToast("Added to your bag");
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => {
      const nextQty = (prev[id] || 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: nextQty };
    });
  }

  function buildWhatsAppUrl(order: StoreOrder) {
    const sym = order.currency === "EUR" ? "€" : "$";
    const lines = [
      `🛍️ *NEW ORDER — LA MAISON*`,
      `🌍 *Country:* ${REGIONS[order.region].flag} ${REGIONS[order.region].name}`,
      `🧾 *Order ID:* #${order.id.slice(-6).toUpperCase()}`,
      ``,
      `👤 *Buyer Details:*`,
      `• Name: ${order.customer_name}`,
      `• Phone: ${order.customer_phone}`,
      `• City / Area: ${order.city}`,
      `• Address: ${order.address}`,
      order.notes ? `• Notes: ${order.notes}` : "",
      ``,
      `📦 *Ordered Items:*`,
      ...order.items.map(
        (it) => `• ${it.qty}x ${it.name} — ${sym}${(it.unitPrice * it.qty).toFixed(2)}`
      ),
      ``,
      `Subtotal: ${sym}${order.subtotal.toFixed(2)}`,
      `Delivery: ${order.delivery_fee === 0 ? "FREE" : `${sym}${order.delivery_fee.toFixed(2)}`}`,
      `💰 *TOTAL (${activeRegion.paymentLabel}): ${sym}${order.total.toFixed(2)}*`,
    ].filter(Boolean);

    return `https://wa.me{WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim() || !city.trim() || !address.trim()) return;

    setSubmittingOrder(true);
    const newOrder: StoreOrder = {
      id: `ord-${Date.now()}`,
      created_at: new Date().toISOString(),
      region,
      currency: activeRegion.currency,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      city: city.trim(),
      address: address.trim(),
      notes: notes.trim(),
      items: cartItems.map((c) => ({
        id: c.product.id,
        name: c.product.name,
        qty: c.qty,
        unitPrice: c.price,
      })),
      subtotal,
      delivery_fee: deliveryFee,
      total,
      status: "pending",
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("store_orders").insert(newOrder);
        if (error) throw error;
      }
      const nextOrders = [newOrder, ...orders];
      setOrders(nextOrders);
      localStorage.setItem("lamaison_orders", JSON.stringify(nextOrders));
      setLastPlacedOrder(newOrder);
      setCart({});
      setCustomerName("");
      setCustomerPhone("");
      setCity("");
      setAddress("");
      setNotes("");
      showToast("Order received! Opening WhatsApp...");
      window.open(buildWhatsAppUrl(newOrder), "_blank", "noopener,noreferrer");
    } catch {
      showToast("Could not save order. Please try again.");
    } finally {
      setSubmittingOrder(false);
    }
  }

  function startEditProduct(p: Product) {
    setEditingId(p.id);
    setPName(p.name);
    setPCat(p.category);
    setPDesc(p.description);
    setPPriceLb(String(p.price_lb));
    setPPriceEu(String(p.price_eu));
    setPImg(p.image_url);
    setPBadge(p.badge || "");
    setPRegions(p.regions);
    setPInStock(p.in_stock);
    setAdminTab("products");
  }

  function resetProductForm() {
    setEditingId(null);
    setPName("");
    setPCat("Kitchenware");
    setPDesc("");
    setPPriceLb("");
    setPPriceEu("");
    setPImg("");
    setPBadge("");
    setPRegions(["LB"]);
    setPInStock(true);
  }

  function toggleProductRegion(code: RegionCode) {
    setPRegions((prev) =>
      prev.includes(code) ? (prev.length > 1 ? prev.filter((r) => r !== code) : prev) : [...prev, code]
    );
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!pName.trim() || !pPriceLb) return;
    const item: Product = {
      id: editingId || `prod-${Date.now()}`,
      name: pName.trim(),
      category: pCat,
      description: pDesc.trim() || "Curated quality essential from La Maison.",
      price_lb: Number(pPriceLb),
      price_eu: Number(pPriceEu || pPriceLb),
      image_url: pImg.trim(),
      regions: pRegions,
      badge: pBadge.trim() || undefined,
      in_stock: pInStock,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from("store_products").upsert(item);
    }

    const next = editingId
      ? products.map((p) => (p.id === editingId ? item : p))
      : [item, ...products];
    setProducts(next);
    localStorage.setItem("lamaison_products", JSON.stringify(next));
    resetProductForm();
    showToast(editingId ? "Product updated" : "Product added to store");
  }

  async function deleteProduct(id: string) {
    if (isSupabaseConfigured && supabase) {
      await supabase.from("store_products").delete().eq("id", id);
    }
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    localStorage.setItem("lamaison_products", JSON.stringify(next));
    showToast("Product removed");
  }

  async function updateOrderStatus(id: string, status: StoreOrder["status"]) {
    if (isSupabaseConfigured && supabase) {
      await supabase.from("store_orders").update({ status }).eq("id", id);
    }
    const next = orders.map((o) => (o.id === id ? { ...o, status } : o));
    setOrders(next);
    localStorage.setItem("lamaison_orders", JSON.stringify(next));
    showToast(`Order marked ${status}`);
  }
      return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917]">
      {/* Top Announcement Bar (Single Detected Country Only) */}
      <div className="border-b border-[#E7E2DA] bg-[#1C1917] px-4 py-2 text-xs text-[#FAF8F5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <p className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-[#D97706]" />
            <span>
              {activeRegion.flag} <strong>{activeRegion.name} Store</strong> · {activeRegion.paymentLabel} · Free delivery over{" "}
              {activeRegion.symbol}{activeRegion.freeDeliveryOver}
            </span>
          </p>
          {adminAuthed && (
            <span className="rounded-full bg-[#D97706]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#FBBF24]">
              Admin Mode Active
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#E7E2DA] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <span className="font-serif-brand text-2xl font-bold tracking-tight sm:text-3xl">
              La Maison
            </span>
            <span className="ml-2 hidden rounded-full bg-[#EFECE6] px-2.5 py-0.5 text-[11px] font-medium text-[#57534E] sm:inline-block">
              Home & Everyday Care
            </span>
          </div>

          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-full border border-[#E7E2DA] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#1C1917] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="relative inline-flex items-center gap-1.5 rounded-full border border-[#E7E2DA] bg-white px-3.5 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F5F2EC] transition"
            >
              <ShieldCheck className="h-4 w-4 text-[#B45309]" />
              <span>Admin</span>
              {pendingOrdersCount > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-[10px] font-bold text-white">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-full bg-[#1C1917] px-4 py-2 text-xs font-semibold text-white hover:bg-[#292524] transition"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Bag</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-[#D97706] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search + Dynamic Category Tabs (Only shown when categories exist) */}
        <div className="mx-auto max-w-7xl space-y-3 px-4 pb-3 sm:px-6">
          <div className="relative md:hidden">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716C]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-full border border-[#E7E2DA] bg-white py-2 pl-10 pr-4 text-sm focus:border-[#1C1917] focus:outline-none"
            />
          </div>

          {activeCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === "All"
                    ? "bg-[#1C1917] text-white"
                    : "border border-[#E7E2DA] bg-white text-[#57534E] hover:text-[#1C1917]"
                }`}
              >
                All
              </button>
              {activeCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    selectedCategory === cat
                      ? "bg-[#1C1917] text-white"
                      : "border border-[#E7E2DA] bg-white text-[#57534E] hover:text-[#1C1917]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Editorial Hero Banner */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[#E7E2DA] bg-gradient-to-br from-[#F3EFE8] via-[#FAF8F5] to-[#EFE8DC] p-7 sm:p-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#9A3412] shadow-2xs">
              {activeRegion.flag} Curated for {activeRegion.name} · {activeRegion.paymentLabel}
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Thoughtful essentials for your kitchen, home & daily care.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#57534E] sm:text-base">
              Curated everyday essentials delivered straight to your door.
            </p>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {selectedCategory === "All" ? `Collection` : selectedCategory}
          </h2>
          {visibleProducts.length > 0 && (
            <span className="text-xs font-medium text-[#78716C]">
              {visibleProducts.length} {visibleProducts.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>

        {visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E2DA] bg-white p-12 text-center">
            <Package className="mx-auto h-9 w-9 text-[#A8A29E]" />
            <p className="mt-3 text-sm font-semibold text-[#1C1917]">
              New collection arriving soon
            </p>
            <p className="mt-1 text-xs text-[#78716C]">
              Items added in Admin for {activeRegion.name} will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#E7E2DA] bg-white shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#F3EFE8]">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-[#A8A29E]">
                      <ImageIcon className="h-8 w-8" />
                      <span className="mt-1 text-[11px] font-medium">La Maison</span>
                    </div>
                  )}
                  {p.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#1C1917]/90 px-3 py-1 text-[11px] font-semibold text-white">
                      {p.badge}
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-medium text-[#57534E]">
                    {p.category}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="text-base font-bold text-[#1C1917]">{p.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#57534E]">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[#F3EFE8] pt-4">
                    <span className="text-lg font-bold text-[#1C1917]">
                      {activeRegion.symbol}{unitPrice(p).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      disabled={!p.in_stock}
                      onClick={() => addToCart(p.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1917] px-4 py-2 text-xs font-semibold text-white hover:bg-[#292524] disabled:opacity-40 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                              {/* Slide-out Shopping Bag & COD Checkout Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7E2DA] px-5 py-4">
              <div>
                <h2 className="text-xl font-bold">Your Shopping Bag</h2>
                <p className="text-xs text-[#78716C]">
                  {activeRegion.flag} {activeRegion.name} · {activeRegion.paymentLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  setLastPlacedOrder(null);
                }}
                className="rounded-full p-2 text-[#57534E] hover:bg-[#F3EFE8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {lastPlacedOrder ? (
                <div className="space-y-4 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-5 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-[#16A34A]" />
                  <h3 className="text-lg font-bold text-[#14532D]">Order Placed Successfully!</h3>
                  <p className="text-xs leading-relaxed text-[#166534]">
                    Thank you! Your order <strong>#{lastPlacedOrder.id.slice(-6).toUpperCase()}</strong> has been submitted to La Maison. We will confirm and prepare your delivery shortly.
                  </p>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="mx-auto h-10 w-10 text-[#D6D3D1]" />
                  <p className="mt-3 text-sm font-medium text-[#57534E]">Your bag is empty</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {cartItems.map(({ product, qty, price }) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] p-3"
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#EFECE6] text-[#A8A29E]">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">{product.name}</p>
                          <p className="text-xs text-[#78716C]">
                            {activeRegion.symbol}{price.toFixed(2)} each
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, -1)}
                              className="rounded border border-[#E7E2DA] bg-white p-1"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-semibold">{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, 1)}
                              className="rounded border border-[#E7E2DA] bg-white p-1"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, -qty)}
                          className="text-[#A8A29E] hover:text-[#DC2626]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 text-xs">
                    <div className="flex justify-between text-[#57534E]">
                      <span>Subtotal</span>
                      <span>{activeRegion.symbol}{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#57534E]">
                      <span>Delivery ({activeRegion.name})</span>
                      <span>
                        {deliveryFee === 0 ? "FREE" : `${activeRegion.symbol}${deliveryFee.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#E7E2DA] pt-2 text-sm font-bold text-[#1C1917]">
                      <span>Total ({activeRegion.paymentLabel})</span>
                      <span>{activeRegion.symbol}{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <form onSubmit={(e) => void placeOrder(e)} className="space-y-3">
                    <h3 className="text-sm font-bold">Delivery Details</h3>
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full Name *"
                      className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none"
                    />
                    <input
                      required
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone Number (WhatsApp) *"
                      className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none"
                    />
                    <input
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={region === "LB" ? "Region / City (e.g. Chouf, Beirut) *" : "City *"}
                      className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none"
                    />
                    <input
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, Building, Floor *"
                      className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none"
                    />
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Delivery notes (optional)"
                      className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingOrder}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C1917] py-3.5 text-xs font-bold text-white hover:bg-[#292524] transition"
                    >
                      <MessageCircle className="h-4 w-4 text-[#22C55E]" />
                      {submittingOrder
                        ? "Submitting Order..."
                        : `Place Order (${activeRegion.paymentLabel})`}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Dashboard Modal */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7E2DA] px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#B45309]" />
                <h2 className="text-xl font-bold">La Maison Admin</h2>
              </div>
              <div className="flex items-center gap-2">
                {adminAuthed && (
                  <button
                    type="button"
                    onClick={() => setAdminAuthed(false)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#E7E2DA] px-3 py-1 text-xs font-medium text-[#57534E]"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Lock
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAdminOpen(false)}
                  className="rounded-full p-1.5 text-[#57534E] hover:bg-[#F3EFE8]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {!adminAuthed ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                          if (passInput === ADMIN_PASSCODE) {
                    setAdminAuthed(true);
                    setPassInput("");
                  } else {
                    showToast("Incorrect admin passcode");
                  }
                }}
                className="mx-auto my-12 w-full max-w-xs space-y-4 px-6 text-center"
              >
                <Lock className="mx-auto h-8 w-8 text-[#B45309]" />
                <h3 className="text-lg font-bold">Enter Admin Passcode</h3>
                <input
                  type="password"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder="Passcode"
                  className="w-full rounded-xl border border-[#E7E2DA] px-4 py-2.5 text-center text-sm focus:border-[#1C1917] focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#1C1917] py-2.5 text-xs font-bold text-white"
                >
                  Unlock Admin Panel
                </button>
              </form>
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                {/* Admin-Only Fast Country Preview Switcher */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] px-4 py-3 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-[#57534E]">
                    <Globe className="h-4 w-4 text-[#B45309]" />
                    Storefront Country View (Admin Only):
                  </span>
                  <div className="flex gap-1.5">
                    {(["LB", "FR", "DE"] as RegionCode[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => adminSwitchRegion(code)}
                        className={`rounded-full px-3 py-1 font-bold transition ${
                          region === code
                            ? "bg-[#1C1917] text-white"
                            : "border border-[#E7E2DA] bg-white text-[#57534E] hover:text-[#1C1917]"
                        }`}
                      >
                        {REGIONS[code].flag} {REGIONS[code].name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6 flex gap-2 border-b border-[#E7E2DA] pb-3">
                  <button
                    type="button"
                    onClick={() => setAdminTab("orders")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${
                      adminTab === "orders"
                        ? "bg-[#1C1917] text-white"
                        : "bg-[#F3EFE8] text-[#57534E]"
                    }`}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Customer Orders ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab("products")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${
                      adminTab === "products"
                        ? "bg-[#1C1917] text-white"
                        : "bg-[#F3EFE8] text-[#57534E]"
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    Manage Products ({products.length})
                  </button>
                </div>

                {adminTab === "orders" ? (
                  <div className="space-y-4">
                    {orders.length === 0 ? (
                      <p className="py-10 text-center text-sm text-[#78716C]">No orders received yet.</p>
                    ) : (
                      orders.map((ord) => (
                        <div
                          key={ord.id}
                          className="rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">
                                #{ord.id.slice(-6).toUpperCase()} · {ord.customer_name}
                              </span>
                              <span className="rounded-full bg-white px-2 py-0.5 font-semibold">
                                {REGIONS[ord.region].flag} {ord.region}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 font-bold capitalize ${
                                  ord.status === "pending"
                                    ? "bg-[#FEF3C7] text-[#B45309]"
                                    : ord.status === "confirmed"
                                    ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                    : "bg-[#DCFCE7] text-[#15803D]"
                                }`}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <span className="text-[#78716C]">
                              {new Date(ord.created_at).toLocaleString()}
                            </span>
                          </div>

                          <p className="mt-2 text-[#57534E]">
                            📞 <strong>{ord.customer_phone}</strong> · 📍 {ord.city}, {ord.address}
                            {ord.notes ? ` (${ord.notes})` : ""}
                          </p>

                          <div className="mt-2 space-y-1 rounded-xl bg-white p-3">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>
                                  {it.qty}× {it.name}
                                </span>
                                <span className="font-semibold">
                                  {(ord.currency === "EUR" ? "€" : "$") +
                                    (it.unitPrice * it.qty).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between border-t border-[#F3EFE8] pt-1.5 font-bold">
                              <span>Total</span>
                              <span>
                                {(ord.currency === "EUR" ? "€" : "$") + ord.total.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void updateOrderStatus(ord.id, "confirmed")}
                              className="rounded-full bg-[#1D4ED8] px-3 py-1.5 font-semibold text-white"
                            >
                              Mark Confirmed
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateOrderStatus(ord.id, "delivered")}
                              className="rounded-full bg-[#15803D] px-3 py-1.5 font-semibold text-white"
                            >
                              Mark Delivered
                            </button>
                            <a
                              href={`https://wa.me{ord.customer_phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[#E7E2DA] bg-white px-3 py-1.5 font-semibold text-[#1C1917]"
                            >
                              Message Buyer on WhatsApp
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                                  <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                    <form
                      onSubmit={(e) => void saveProduct(e)}
                      className="space-y-3 rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 text-xs"
                    >
                      <h3 className="text-sm font-bold">
                        {editingId ? "Edit Product" : "Add New Product"}
                      </h3>
                      <input
                        required
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        placeholder="Product Name *"
                        className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2"
                      />
                      <select
                        value={pCat}
                        onChange={(e) => setPCat(e.target.value as ProductCategory)}
                        className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2"
                      >
                        {ADMIN_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <textarea
                        rows={2}
                        value={pDesc}
                        onChange={(e) => setPDesc(e.target.value)}
                        placeholder="Short product description"
                        className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={pPriceLb}
                          onChange={(e) => setPPriceLb(e.target.value)}
                          placeholder="Lebanon Price ($ USD) *"
                          className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={pPriceEu}
                          onChange={(e) => setPPriceEu(e.target.value)}
                          placeholder="France/Germany (€ EUR)"
                          className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2"
                        />
                      </div>
                      <input
                        value={pImg}
                        onChange={(e) => setPImg(e.target.value)}
                        placeholder="Product Photo URL (https://...)"
                        className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2"
                      />
                      <input
                        value={pBadge}
                        onChange={(e) => setPBadge(e.target.value)}
                        placeholder="Badge (optional, e.g. Best Seller, New)"
                        className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2"
                      />

                      <div>
                        <p className="mb-1.5 font-semibold text-[#57534E]">Visible Countries:</p>
                        <div className="flex gap-2">
                          {(["LB", "FR", "DE"] as RegionCode[]).map((code) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => toggleProductRegion(code)}
                              className={`rounded-lg border px-3 py-1.5 font-semibold ${
                                pRegions.includes(code)
                                  ? "border-[#1C1917] bg-[#1C1917] text-white"
                                  : "border-[#E7E2DA] bg-white text-[#57534E]"
                              }`}
                            >
                              {REGIONS[code].flag} {code}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={pInStock}
                          onChange={(e) => setPInStock(e.target.checked)}
                        />
                        In Stock & Available
                      </label>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="submit"
                          className="flex-1 rounded-full bg-[#1C1917] py-2.5 font-bold text-white"
                        >
                          {editingId ? "Update Product" : "Add Product"}
                        </button>
                        {editingId && (
                          <button
                            type="button"
                            onClick={resetProductForm}
                            className="rounded-full border border-[#E7E2DA] bg-white px-4 py-2.5 font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="space-y-2.5">
                      {products.length === 0 ? (
                        <p className="py-8 text-center text-xs text-[#78716C]">
                          No products added yet. Add your first item using the form!
                        </p>
                      ) : (
                        products.map((prod) => (
                          <div
                            key={prod.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E2DA] p-3 text-xs"
                          >
                            {prod.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EFECE6] text-[#A8A29E]">
                                <ImageIcon className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold">{prod.name}</p>
                              <p className="text-[#78716C]">
                                {prod.category} · ${prod.price_lb} / €{prod.price_eu} ·{" "}
                                {prod.regions.join(", ")}
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditProduct(prod)}
                                className="rounded-lg border border-[#E7E2DA] p-2 hover:bg-[#F3EFE8]"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteProduct(prod.id)}
                                className="rounded-lg border border-[#E7E2DA] p-2 text-[#DC2626] hover:bg-[#FEF2F2]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clean Minimal Footer */}
      <footer className="border-t border-[#E7E2DA] bg-white px-4 py-8 text-xs text-[#78716C]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="font-serif-brand text-lg font-bold text-[#1C1917]">La Maison</p>
          <p>© {new Date().getFullYear()} La Maison · {activeRegion.name}</p>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-semibold text-white shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
                              }
                    

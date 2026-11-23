import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search, Plus, ShieldCheck, Package, Truck, Image as ImageIcon } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { ADMIN_CATEGORIES, INITIAL_PRODUCTS, REGIONS, detectVisitorRegion, type Product, type RegionCode, type StoreOrder } from "./storeData";
import { CartDrawer } from "./CartDrawer";
import { AdminModal } from "./AdminModal";

const WHATSAPP_NUMBER = "96181428535";

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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeRegion = REGIONS[region];
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }

  useEffect(() => {
    async function loadStore() {
      if (isSupabaseConfigured && supabase) {
        const { data: prodData } = await supabase.from("store_products").select("*").order("created_at", { ascending: false });
        if (prodData) setProducts(prodData as Product[]);
        const { data: orderData } = await supabase.from("store_orders").select("*").order("created_at", { ascending: false });
        if (orderData) setOrders(orderData as StoreOrder[]);
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "store_orders" }, (payload) => {
        const newOrder = payload.new as StoreOrder;
        setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        showToast(`New order from ${newOrder.customer_name} (${newOrder.region})!`);
      })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, []);

  function adminSwitchRegion(next: RegionCode) {
    setRegion(next);
    setSelectedCategory("All");
    setCart({});
    showToast(`Previewing ${REGIONS[next].flag} ${REGIONS[next].name} storefront`);
  }

  function unitPrice(p: Product) {
    return region === "LB" ? Number(p.price_lb) : Number(p.price_eu);
  }

  const regionProducts = useMemo(() => products.filter((p) => p.regions.includes(region)), [products, region]);

  const activeCategories = useMemo(() => {
    const present = new Set(regionProducts.map((p) => p.category));
    return ADMIN_CATEGORIES.filter((cat) => present.has(cat));
  }, [regionProducts]);

  const visibleProducts = useMemo(() => {
    return regionProducts.filter((p) => {
      if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [regionProducts, selectedCategory, search]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product && qty > 0 ? { product, qty, price: unitPrice(product) } : null;
      })
      .filter(Boolean) as { product: Product; qty: number; price: number }[];
  }, [cart, products, region]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = subtotal === 0 || subtotal >= activeRegion.freeDeliveryOver ? 0 : activeRegion.deliveryFee;
  const total = subtotal + deliveryFee;
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    showToast("Added to your bag");
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => {
      const nextQty = (prev[id] || 0) + delta;
      if (nextQty <= 0) { const copy = { ...prev }; delete copy[id]; return copy; }
      return { ...prev, [id]: nextQty };
    });
  }

  async function handleOrderSubmit(details: { name: string; phone: string; city: string; address: string; notes: string }) {
    if (cartItems.length === 0) return null;
    const newOrder: StoreOrder = {
      id: `ord-${Date.now()}`,
      created_at: new Date().toISOString(),
      region,
      currency: activeRegion.currency,
      customer_name: details.name.trim(),
      customer_phone: details.phone.trim(),
      city: details.city.trim(),
      address: details.address.trim(),
      notes: details.notes.trim(),
      items: cartItems.map((c) => ({ id: c.product.id, name: c.product.name, qty: c.qty, unitPrice: c.price })),
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
      setCart({});
      showToast("Order received! Opening WhatsApp...");

      const sym = newOrder.currency === "EUR" ? "€" : "$";
      const lines = [
        `🛍️ *NEW ORDER — LA MAISON*`,
        `🌍 *Country:* ${REGIONS[newOrder.region].flag} ${REGIONS[newOrder.region].name}`,
        `🧾 *Order ID:* #${newOrder.id.slice(-6).toUpperCase()}`,
        ``,
        `👤 *Buyer Details:*`,
        `• Name: ${newOrder.customer_name}`,
        `• Phone: ${newOrder.customer_phone}`,
        `• City / Area: ${newOrder.city}`,
        `• Address: ${newOrder.address}`,
        newOrder.notes ? `• Notes: ${newOrder.notes}` : "",
        ``,
        `📦 *Ordered Items:*`,
        ...newOrder.items.map((it) => `• ${it.qty}x ${it.name} — ${sym}${(it.unitPrice * it.qty).toFixed(2)}`),
        ``,
        `Subtotal: ${sym}${newOrder.subtotal.toFixed(2)}`,
        `Delivery: ${newOrder.delivery_fee === 0 ? "FREE" : `${sym}${newOrder.delivery_fee.toFixed(2)}`}`,
        `💰 *TOTAL (${activeRegion.paymentLabel}): ${sym}${newOrder.total.toFixed(2)}*`,
      ].filter(Boolean);
      window.open(`https://wa.me{WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
      return newOrder;
    } catch {
      showToast("Could not save order. Please try again.");
      return null;
    }
  }

  async function saveProduct(item: Product, isEdit: boolean) {
    if (isSupabaseConfigured && supabase) await supabase.from("store_products").upsert(item);
    const next = isEdit ? products.map((p) => (p.id === item.id ? item : p)) : [item, ...products];
    setProducts(next);
    localStorage.setItem("lamaison_products", JSON.stringify(next));
    showToast(isEdit ? "Product updated" : "Product added to store");
  }

  async function deleteProduct(id: string) {
    if (isSupabaseConfigured && supabase) await supabase.from("store_products").delete().eq("id", id);
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    localStorage.setItem("lamaison_products", JSON.stringify(next));
    showToast("Product removed");
  }

  async function updateOrderStatus(id: string, status: StoreOrder["status"]) {
    if (isSupabaseConfigured && supabase) await supabase.from("store_orders").update({ status }).eq("id", id);
    const next = orders.map((o) => (o.id === id ? { ...o, status } : o));
    setOrders(next);
    localStorage.setItem("lamaison_orders", JSON.stringify(next));
    showToast(`Order marked ${status}`);
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917]">
      <div className="border-b border-[#E7E2DA] bg-[#1C1917] px-4 py-2 text-xs text-[#FAF8F5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <p className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-[#D97706]" />
            <span>{activeRegion.flag} <strong>{activeRegion.name} Store</strong> · {activeRegion.paymentLabel} · Free delivery over {activeRegion.symbol}{activeRegion.freeDeliveryOver}</span>
          </p>
          {adminAuthed && <span className="rounded-full bg-[#D97706]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#FBBF24]">Admin Mode Active</span>}
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-[#E7E2DA] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <span className="font-serif-brand text-2xl font-bold tracking-tight sm:text-3xl">La Maison</span>
            <span className="ml-2 hidden rounded-full bg-[#EFECE6] px-2.5 py-0.5 text-[11px] font-medium text-[#57534E] sm:inline-block">Home & Everyday Care</span>
          </div>

          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716C]" />
                  <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} region={region} cartItems={cartItems} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onUpdateQty={updateQty} onSubmitOrder={handleOrderSubmit} />
      <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} authed={adminAuthed} setAuthed={setAdminAuthed} region={region} onSwitchRegion={adminSwitchRegion} products={products} orders={orders} onSaveProduct={saveProduct} onDeleteProduct={deleteProduct} onUpdateOrderStatus={updateOrderStatus} onToast={showToast} />

      <footer className="border-t border-[#E7E2DA] bg-white px-4 py-8 text-xs text-[#78716C]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="font-serif-brand text-lg font-bold text-[#1C1917]">La Maison</p>
          <p>© {new Date().getFullYear()} La Maison · {activeRegion.name}</p>
        </div>
      </footer>

      {toastMsg && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-semibold text-white shadow-lg">{toastMsg}</div>}
    </div>
  );
          }
          

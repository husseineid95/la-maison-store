import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search, Plus, ShieldCheck, Package, Truck, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { ADMIN_CATEGORIES, INITIAL_PRODUCTS, LANGUAGES, REGIONS, detectVisitorLang, detectVisitorRegion, getProductImages, getProductText, type LangCode, type Product, type RegionCode, type StoreOrder } from "./storeData";
import { CartDrawer } from "./CartDrawer";
import { AdminModal } from "./AdminModal";

const WHATSAPP_NUMBER = "96181428535";

const UI_COPY: Record<LangCode, {
  tagline: string; search: string; bag: string; all: string;
  heroTitle: string; heroSub: string; collection: string;
  emptyTitle: string; emptySub: string; addToBag: string; outOfStock: string;
  freeOver: string;
}> = {
  en: { tagline: "Home & Everyday Care", search: "Search products...", bag: "Bag", all: "All", heroTitle: "Thoughtful essentials for your kitchen, home & daily care.", heroSub: "Curated everyday essentials delivered straight to your door.", collection: "Collection", emptyTitle: "New collection arriving soon", emptySub: "Curated items will appear here shortly.", addToBag: "Add to Bag", outOfStock: "Out of Stock", freeOver: "Free delivery over" },
  ar: { tagline: "العناية بالمنزل والحياة اليومية", search: "ابحث عن المنتجات...", bag: "السلة", all: "الكل", heroTitle: "مستلزمات مختارة بعناية لمطبخك ومنزلك وعنايتك اليومية.", heroSub: "منتجات يومية عالية الجودة تصلك مباشرة إلى باب منزلك.", collection: "المجموعة", emptyTitle: "تشكيلة جديدة قريباً", emptySub: "ستظهر المنتجات المضافة هنا فور توفرها.", addToBag: "أضف إلى السلة", outOfStock: "نفذت الكمية", freeOver: "توصيل مجاني للطلبات فوق" },
  fr: { tagline: "Maison & Soins Quotidiens", search: "Rechercher des produits...", bag: "Panier", all: "Tout", heroTitle: "Des essentiels pensés pour votre cuisine, votre maison et vos soins.", heroSub: "Une sélection du quotidien livrée directement chez vous.", collection: "Collection", emptyTitle: "Nouvelle collection bientôt disponible", emptySub: "Les articles apparaîtront ici dès leur mise en ligne.", addToBag: "Ajouter", outOfStock: "Rupture", freeOver: "Livraison gratuite dès" },
  de: { tagline: "Haushalt & Tägliche Pflege", search: "Produkte suchen...", bag: "Warenkorb", all: "Alle", heroTitle: "Durchdachte Essentials für Küche, Zuhause & tägliche Pflege.", heroSub: "Ausgewählte Alltagsprodukte direkt zu Ihnen nach Hause geliefert.", collection: "Kollektion", emptyTitle: "Neue Kollektion folgt in Kürze", emptySub: "Neue Artikel erscheinen hier, sobald sie verfügbar sind.", addToBag: "In den Warenkorb", outOfStock: "Ausverkauft", freeOver: "Kostenlose Lieferung ab" },
};

export default function App() {
  const [region, setRegion] = useState<RegionCode>(() => detectVisitorRegion());
  const [lang, setLang] = useState<LangCode>(() => detectVisitorLang());
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [photoIdxMap, setPhotoIdxMap] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeRegion = REGIONS[region];
  const t = UI_COPY[lang];
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }

  function changeLang(next: LangCode) {
    setLang(next);
    localStorage.setItem("lamaison_lang", next);
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
        const loc = getProductText(p, lang);
        return loc.name.toLowerCase().includes(q) || loc.description.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [regionProducts, selectedCategory, search, lang]);

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

  function stepPhoto(productId: string, totalPhotos: number, delta: number) {
    setPhotoIdxMap((prev) => {
      const curr = prev[productId] || 0;
      const next = (curr + delta + totalPhotos) % totalPhotos;
      return { ...prev, [productId]: next };
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
      

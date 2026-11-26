import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search, Plus, Minus, Package, Image as ImageIcon, ChevronLeft, ChevronRight, ArrowRight, X, Check } from "lucide-react";
import { ADMIN_CATEGORIES, INITIAL_PRODUCTS, LANGUAGES, REGIONS, detectVisitorLang, detectVisitorRegion, getProductImages, getProductText, isVideoMedia, type LangCode, type Product, type RegionCode, type StoreOrder } from "./storeData";
import { CartDrawer } from "./CartDrawer";
import { AdminPanel, type HeroBannerConfig } from "./AdminPanel";

const UI_COPY: Record<LangCode, {
  announcement: string; search: string; bag: string; all: string;
  heroEyebrow: string; heroTitle: string; heroSub: string; heroCta: string;
  collectionsTitle: string; catalogTitle: string;
  emptyTitle: string; emptySub: string; addToBag: string; outOfStock: string;
  quickView: string; footerDesc: string;
  sortFeatured: string; sortPriceAsc: string; sortPriceDesc: string; inStockOnly: string;
  inStockLabel: string; onlyLeftLabel: string;
}> = {
  en: {
    announcement: "Curated Home & Everyday Care", search: "Search our store...", bag: "Cart", all: "All Products",
    heroEyebrow: "AMVISAT · HOME & DAILY CARE", heroTitle: "Thoughtful essentials for every corner of home.",
    heroSub: "Curated kitchenware, home care, and everyday living pieces chosen for quality, simplicity, and lasting value.",
    heroCta: "Shop Collection", collectionsTitle: "Shop by Collection", catalogTitle: "Featured Collection",
    emptyTitle: "Collection arriving soon", emptySub: "New curated pieces will appear here shortly.",
    addToBag: "Add to cart", outOfStock: "Sold out", quickView: "View details",
    footerDesc: "Thoughtfully curated home, kitchen, and everyday care essentials.",
    sortFeatured: "Sort: Featured", sortPriceAsc: "Price: Low to High", sortPriceDesc: "Price: High to Low", inStockOnly: "In stock only",
    inStockLabel: "in stock", onlyLeftLabel: "left in stock",
  },
  ar: {
    announcement: "مستلزمات مختارة للمنزل والعناية اليومية", search: "ابحث في المتجر...", bag: "السلة", all: "جميع المنتجات",
    heroEyebrow: "تشكيلة الموسم الجديد", heroTitle: "حياة يومية أكثر أناقة وبساطة.",
    heroSub: "اكتشف مستلزمات المطبخ والمنزل والعناية اليومية المختارة بعناية لتناسب أسلوب حياتك.",
    heroCta: "تسوق المجموعة", collectionsTitle: "تسوق حسب القسم", catalogTitle: "المجموعة المختارة",
    emptyTitle: "التشكيلة قيد الإضافة", emptySub: "ستظهر المنتجات الجديدة هنا قريباً.",
    addToBag: "أضف إلى السلة", outOfStock: "نفذت الكمية", quickView: "التفاصيل",
    footerDesc: "مستلزمات منزلية ويومية مختارة بعناية وبساطة.",
    sortFeatured: "الترتيب: المميز", sortPriceAsc: "السعر: من الأقل للأعلى", sortPriceDesc: "السعر: من الأعلى للأقل", inStockOnly: "المتوفر فقط",
    inStockLabel: "متوفر", onlyLeftLabel: "متبقي فقط",
  },
  fr: {
    announcement: "Maison & Soins Quotidiens Sélectionnés", search: "Rechercher...", bag: "Panier", all: "Tous les produits",
    heroEyebrow: "Nouvelle Sélection", heroTitle: "L'essentiel du quotidien, tout en simplicité.",
    heroSub: "Des articles de cuisine, d'entretien et de soin pensés pour accompagner votre intérieur chaque jour.",
    heroCta: "Découvrir", collectionsTitle: "Collections", catalogTitle: "Notre Sélection",
    emptyTitle: "Collection bientôt disponible", emptySub: "De nouveaux articles apparaîtront ici prochainement.",
    addToBag: "Ajouter au panier", outOfStock: "Épuisé", quickView: "Voir détails",
    footerDesc: "Essentiels pour la maison, la cuisine et le soin quotidien.",
    sortFeatured: "Trier : En vedette", sortPriceAsc: "Prix : Croissant", sortPriceDesc: "Prix : Décroissant", inStockOnly: "En stock uniquement",
    inStockLabel: "en stock", onlyLeftLabel: "restants",
  },
  de: {
    announcement: "Ausgewählte Haushalts- & Pflege-Essentials", search: "Suchen...", bag: "Warenkorb", all: "Alle Produkte",
    heroEyebrow: "Neue Auswahl", heroTitle: "Durchdachte Essentials für jeden Tag.",
    heroSub: "Entdecken Sie ausgewählte Küchen-, Haushalts- und Pflegeprodukte für ein harmonisches Zuhause.",
    heroCta: "Kollektion ansehen", collectionsTitle: "Kategorien", catalogTitle: "Ausgewählte Kollektion",
    emptyTitle: "Kollektion folgt in Kürze", emptySub: "Neue Artikel erscheinen hier in Kürze.",
    addToBag: "In den Warenkorb", outOfStock: "Ausverkauft", quickView: "Details",
    footerDesc: "Sorgfältig ausgewählte Produkte für Küche, Haushalt und Pflege.",
    sortFeatured: "Sortieren: Empfohlen", sortPriceAsc: "Preis: Aufsteigend", sortPriceDesc: "Preis: Absteigend", inStockOnly: "Nur auf Lager",
    inStockLabel: "auf Lager", onlyLeftLabel: "übrig",
  },
};
export default function App() {
  const [region, setRegion] = useState<RegionCode>(() => detectVisitorRegion());
  const [lang, setLang] = useState<LangCode>(() => detectVisitorLang());
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [heroConfig, setHeroConfig] = useState<HeroBannerConfig>(() => {
    try { return JSON.parse(localStorage.getItem("amvisat_hero") || "{}"); } catch { return {}; }
  });

  const [cart, setCart] = useState<Record<string, number>>({});
  const [photoIdxMap, setPhotoIdxMap] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const [quickQty, setQuickQty] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1"
  );
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeRegion = REGIONS[region];
  const t = UI_COPY[lang];

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function safeCache(key: string, val: unknown) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  function changeLang(next: LangCode) {
    setLang(next);
    try { localStorage.setItem("lamaison_lang", next); } catch {}
  }

  function adminSwitchRegion(next: RegionCode) {
    setRegion(next);
    setSelectedCategory("All");
    setCart({});
    showToast("Previewing " + REGIONS[next].flag + " " + REGIONS[next].name);
  }

  async function saveHeroConfig(next: HeroBannerConfig) {
    setHeroConfig(next);
    safeCache("amvisat_hero", next);
    await fetch("/api/settings", { method: "POST", body: JSON.stringify(next) });
    showToast("Hero banner updated!");
  }

  useEffect(() => {
    async function loadStore() {
      try {
        const regRes = await fetch("/api/region");
        if (regRes.ok) {
          const regData = (await regRes.json()) as { region?: RegionCode };
          if (regData.region && regData.region in REGIONS) {
            setRegion(regData.region);
          }
        }
      } catch {}

      let cachedProds: Product[] = [];
      const localProds = localStorage.getItem("lamaison_products");
      if (localProds) {
        try { cachedProds = JSON.parse(localProds); setProducts(cachedProds); } catch {}
      }
      const localOrders = localStorage.getItem("lamaison_orders");
      if (localOrders) {
        try { setOrders(JSON.parse(localOrders)); } catch {}
      }
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const cloudProds = (await res.json()) as Product[];
          if (Array.isArray(cloudProds) && cloudProds.length > 0) {
            setProducts(cloudProds);
            safeCache("lamaison_products", cloudProds);
          } else if (cachedProds.length > 0) {
            await fetch("/api/products", { method: "POST", body: JSON.stringify(cachedProds) });
          }
        }
        const cfgRes = await fetch("/api/settings");
        if (cfgRes.ok) {
          const cfg = (await cfgRes.json()) as HeroBannerConfig;
          if (cfg && typeof cfg === "object") {
            setHeroConfig(cfg);
            safeCache("amvisat_hero", cfg);
          }
        }
        const ordRes = await fetch("/api/orders");
        if (ordRes.ok) {
          const cloudOrders = (await ordRes.json()) as StoreOrder[];
          if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
            setOrders(cloudOrders);
            safeCache("lamaison_orders", cloudOrders);
          }
        }
      } catch {}
    }
    void loadStore();
  }, []);

  function unitPrice(p: Product) {
    return region === "LB" ? Number(p.price_lb) : Number(p.price_eu);
  }

  function isAvailable(p: Product) {
    if (!p.in_stock) return false;
    if (typeof p.stock_qty === "number" && p.stock_qty <= 0) return false;
    return true;
  }

  const regionProducts = useMemo(() => products.filter((p) => p.regions.includes(region)), [products, region]);

  const activeCategories = useMemo(() => {
    const present = new Set(regionProducts.map((p) => p.category));
    return ADMIN_CATEGORIES.filter((cat) => present.has(cat));
  }, [regionProducts]);

  const visibleProducts = useMemo(() => {
    const filtered = regionProducts.filter((p) => {
      if (onlyInStock && !isAvailable(p)) return false;
      if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const loc = getProductText(p, lang);
        return (
          loc.name.toLowerCase().includes(q) ||
          loc.description.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === "price-asc") return [...filtered].sort((a, b) => unitPrice(a) - unitPrice(b));
    if (sortBy === "price-desc") return [...filtered].sort((a, b) => unitPrice(b) - unitPrice(a));
    return filtered;
  }, [regionProducts, selectedCategory, search, lang, onlyInStock, sortBy, region]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product && qty > 0 ? { product, qty, price: unitPrice(product) } : null;
      })
      .filter(Boolean) as { product: Product; qty: number; price: number }[];
  }, [cart, products, region]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = 0;
  const total = subtotal;
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(id: string, amount = 1) {
    const prod = products.find((p) => p.id === id);
    if (!prod || !isAvailable(prod)) return;
    const maxAllowed = typeof prod.stock_qty === "number" ? prod.stock_qty : 999;
    const current = cart[id] || 0;
    if (current + amount > maxAllowed) {
      showToast(`Only ${maxAllowed} available in stock`);
      setCart((prev) => ({ ...prev, [id]: maxAllowed }));
      return;
    }
    setCart((prev) => ({ ...prev, [id]: current + amount }));
    showToast("Added to cart");
  }

  function updateQty(id: string, delta: number) {
    const prod = products.find((p) => p.id === id);
    const maxAllowed = prod && typeof prod.stock_qty === "number" ? prod.stock_qty : 999;
    setCart((prev) => {
      const nextQty = Math.min(maxAllowed, (prev[id] || 0) + delta);
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
      delivery_fee: 0,
      total: subtotal,
      status: "pending",
    };

    const updatedProducts = products.map((p) => {
      const ordered = cartItems.find((c) => c.product.id === p.id);
      if (!ordered || typeof p.stock_qty !== "number") return p;
      const remaining = Math.max(0, p.stock_qty - ordered.qty);
      return { ...p, stock_qty: remaining, in_stock: remaining > 0 };
    });
    setProducts(updatedProducts);
    safeCache("lamaison_products", updatedProducts);
    void fetch("/api/products", { method: "POST", body: JSON.stringify(updatedProducts) });

    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);
    safeCache("lamaison_orders", nextOrders);
    void fetch("/api/orders", { method: "POST", body: JSON.stringify(nextOrders) });
    setCart({});
    showToast("Order placed!");
    return newOrder;
      }
            async function saveProduct(item: Product, isEdit: boolean) {
    const cover = Array.isArray(item.images) && item.images.length > 0 ? item.images.at(0) || "" : (item.image_url || "");
    const cleanItem: Product = {
      ...item,
      image_url: cover,
      images: Array.isArray(item.images) ? item.images : (cover ? [cover] : []),
      translations: item.translations || {},
    };
    const next = isEdit ? products.map((p) => (p.id === cleanItem.id ? cleanItem : p)) : [cleanItem, ...products];
    setProducts(next);
    safeCache("lamaison_products", next);
    await fetch("/api/products", { method: "POST", body: JSON.stringify(next) });
    showToast(isEdit ? "Product updated & synced!" : "Product added & synced!");
  }

  async function deleteProduct(id: string) {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    safeCache("lamaison_products", next);
    await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast("Product removed");
  }

  async function updateOrderStatus(id: string, status: StoreOrder["status"]) {
    const next = orders.map((o) => (o.id === id ? { ...o, status } : o));
    setOrders(next);
    safeCache("lamaison_orders", next);
    await fetch("/api/orders", { method: "POST", body: JSON.stringify(next) });
    showToast(`Order marked ${status}`);
  }

  async function deleteOrder(id: string) {
    const next = orders.filter((o) => o.id !== id);
    setOrders(next);
    safeCache("lamaison_orders", next);
    await fetch("/api/orders", { method: "POST", body: JSON.stringify(next) });
    showToast("Order deleted");
  }

  const featuredCover = useMemo(() => {
    if (heroConfig.image?.trim()) return heroConfig.image.trim();
    for (const p of regionProducts) {
      const m = getProductImages(p).find((src) => !isVideoMedia(src));
      if (m) return m;
    }
    return "";
  }, [heroConfig.image, regionProducts]);

  const heroEyebrowText = heroConfig.eyebrow?.trim() || t.heroEyebrow;
  const heroTitleText = heroConfig.title?.trim() || t.heroTitle;
  const heroSubText = heroConfig.subtitle?.trim() || t.heroSub;
  const heroCtaText = heroConfig.cta?.trim() || t.heroCta;

  return (
    <div dir={LANGUAGES[lang].dir} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-white text-[#121212]">
      <div className="border-b border-neutral-200 bg-[#121212] px-4 py-2 text-[11px] tracking-widest text-white uppercase">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <p className="truncate font-medium">{t.announcement}</p>
          <div className="flex shrink-0 items-center gap-1">
            {(["en", "ar", "fr", "de"] as LangCode[]).map((code) => (
              <button key={code} type="button" onClick={() => changeLang(code)} className={`px-2 py-0.5 text-[10px] font-semibold transition ${lang === code ? "bg-white text-[#121212]" : "text-neutral-300 hover:text-white"}`}>
                {LANGUAGES[code].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <button type="button" onClick={() => setSearchOpen((v) => !v)} aria-label="Search" className="p-2 text-[#121212] hover:opacity-70 transition">
            {searchOpen ? <X className="h-5 w-5"></X> : <Search className="h-5 w-5"></Search>}
          </button>

          <span
            onClick={() => {
              const n = logoTaps + 1;
              if (n >= 5) { setAdminOpen(true); setLogoTaps(0); }
              else setLogoTaps(n);
            }}
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="cursor-pointer select-none text-2xl font-semibold tracking-[0.22em] text-[#121212] uppercase sm:text-3xl"
          >
            AMVISAT
          </span>

          <button type="button" onClick={() => setCartOpen(true)} className="relative inline-flex items-center gap-2 p-2 text-[#121212] hover:opacity-70 transition">
            <ShoppingBag className="h-5 w-5"></ShoppingBag>
            {cartCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#121212] px-1.5 text-[10px] font-semibold text-white">{cartCount}</span>}
          </button>
        </div>

        {searchOpen && (
          <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-8">
            <div className="mx-auto flex max-w-2xl items-center gap-2 border border-neutral-300 bg-white px-3.5 py-2">
              <Search className="h-4 w-4 text-neutral-400"></Search>
              <input autoFocus type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} className="w-full text-sm focus:outline-none"></input>
              {search && <button type="button" onClick={() => setSearch("")} className="text-xs text-neutral-500 hover:text-[#121212]">Clear</button>}
            </div>
          </div>
        )}
      </header>

      <section className="border-b border-neutral-200 bg-[#F6F5F3]">
        <div className="mx-auto grid max-w-7xl items-center md:grid-cols-2">
          <div className="px-6 py-12 sm:px-12 sm:py-16 lg:py-20">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-neutral-500 uppercase">{heroEyebrowText}</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="mt-3 text-4xl font-semibold leading-tight text-[#121212] sm:text-5xl">{heroTitleText}</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600">{heroSubText}</p>
            <a href="#catalog" className="mt-7 inline-flex items-center gap-2.5 border border-[#121212] bg-[#121212] px-7 py-3.5 text-xs font-medium tracking-widest text-white uppercase hover:bg-transparent hover:text-[#121212] transition">
              <span>{heroCtaText}</span>
              <ArrowRight className="h-3.5 w-3.5"></ArrowRight>
            </a>
          </div>
          <div className="relative flex min-h-[260px] items-center justify-center border-t border-neutral-200 bg-white p-8 md:min-h-[380px] md:border-t-0 md:border-l">
            {featuredCover ? (
              <img src={featuredCover} alt="AMVISAT Featured" className="h-64 w-full object-contain sm:h-80"></img>
            ) : (
              <div className="text-center">
                <p style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-3xl font-semibold tracking-[0.24em] text-neutral-300 uppercase">AMVISAT</p>
              </div>
            )}
          </div>
        </div>
      </section>
          {activeCategories.length > 0 && (
        <section className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button type="button" onClick={() => setSelectedCategory("All")} className={`shrink-0 border px-4 py-2 text-xs font-medium tracking-wider uppercase transition ${selectedCategory === "All" ? "border-[#121212] bg-[#121212] text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-[#121212]"}`}>{t.all}</button>
              {activeCategories.map((cat) => (
                <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} className={`shrink-0 border px-4 py-2 text-xs font-medium tracking-wider uppercase transition ${selectedCategory === cat ? "border-[#121212] bg-[#121212] text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-[#121212]"}`}>{cat}</button>
              ))}
            </div>
          </div>
        </section>
      )}

      <main id="catalog" className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="flex items-baseline gap-3">
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl font-semibold tracking-tight text-[#121212] sm:text-3xl">
              {selectedCategory === "All" ? t.catalogTitle : selectedCategory}
            </h2>
            {visibleProducts.length > 0 && <span className="text-xs tracking-wider text-neutral-500 uppercase">{visibleProducts.length} items</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setOnlyInStock((v) => !v)}
              className={`border px-3 py-1.5 font-medium transition ${onlyInStock ? "border-[#121212] bg-[#121212] text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-[#121212]"}`}
            >
              {t.inStockOnly}
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "featured" | "price-asc" | "price-desc")}
              className="border border-neutral-300 bg-white px-3 py-1.5 font-medium text-[#121212] focus:border-[#121212] focus:outline-none"
            >
              <option value="featured">{t.sortFeatured}</option>
              <option value="price-asc">{t.sortPriceAsc}</option>
              <option value="price-desc">{t.sortPriceDesc}</option>
            </select>
          </div>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="border border-neutral-200 bg-[#F6F5F3] px-6 py-16 text-center">
            <Package className="mx-auto h-8 w-8 text-neutral-400"></Package>
            <p className="mt-3 text-sm font-medium text-[#121212]">{t.emptyTitle}</p>
            <p className="mt-1 text-xs text-neutral-500">{t.emptySub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {visibleProducts.map((p) => {
              const media = getProductImages(p);
              const idx = Math.min(photoIdxMap[p.id] || 0, Math.max(0, media.length - 1));
              const activeSrc = media.at(idx) || "";
              const loc = getProductText(p, lang);
              const avail = isAvailable(p);
              const hasQty = typeof p.stock_qty === "number";

              return (
                <article key={p.id} className="group flex flex-col">
                  <div onClick={() => { setQuickProduct(p); setQuickQty(1); }} className="relative aspect-square cursor-pointer overflow-hidden border border-neutral-200 bg-white">
                    {activeSrc ? (
                      isVideoMedia(activeSrc) ? (
                        <video src={activeSrc} playsInline muted loop className="h-full w-full object-contain p-2"></video>
                      ) : (
                        <img src={activeSrc} alt={loc.name} className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105"></img>
                      )
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-neutral-300"><ImageIcon className="h-7 w-7"></ImageIcon><span className="mt-1 text-[10px] tracking-widest uppercase">AMVISAT</span></div>
                    )}

                    {media.length > 1 && (
                      <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); stepPhoto(p.id, media.length, -1); }} className="absolute left-2 top-1/2 -translate-y-1/2 border border-neutral-200 bg-white/95 p-1 text-[#121212] opacity-90 hover:opacity-100"><ChevronLeft className="h-3.5 w-3.5"></ChevronLeft></button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); stepPhoto(p.id, media.length, 1); }} className="absolute right-2 top-1/2 -translate-y-1/2 border border-neutral-200 bg-white/95 p-1 text-[#121212] opacity-90 hover:opacity-100"><ChevronRight className="h-3.5 w-3.5"></ChevronRight></button>
                      </>
                    )}

                    {p.badge && <span className="absolute left-2.5 top-2.5 bg-[#121212] px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-white uppercase">{p.badge}</span>}
                  </div>

                  <div className="mt-3.5 flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-[10px] tracking-widest text-neutral-400 uppercase">{p.category}</p>
                      <h3 onClick={() => { setQuickProduct(p); setQuickQty(1); }} className="mt-1 cursor-pointer text-sm font-medium text-[#121212] group-hover:underline">{loc.name}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-[#121212]">{activeRegion.symbol}{unitPrice(p).toFixed(2)}</p>
                        {hasQty && (
                          <span className={`text-[11px] font-medium ${!avail ? "text-red-600" : (p.stock_qty || 0) <= 5 ? "text-amber-700" : "text-neutral-500"}`}>
                            {!avail ? t.outOfStock : `${p.stock_qty} ${(p.stock_qty || 0) <= 5 ? t.onlyLeftLabel : t.inStockLabel}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="button" disabled={!avail} onClick={() => addToCart(p.id)} className="mt-3.5 w-full border border-[#121212] bg-white py-2.5 text-[11px] font-medium tracking-widest text-[#121212] uppercase hover:bg-[#121212] hover:text-white disabled:opacity-40 transition">
                      {avail ? t.addToBag : t.outOfStock}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {quickProduct && (() => {
        const qMedia = getProductImages(quickProduct);
        const qIdx = Math.min(photoIdxMap[quickProduct.id] || 0, Math.max(0, qMedia.length - 1));
        const qSrc = qMedia.at(qIdx) || "";
        const qLoc = getProductText(quickProduct, lang);
        const qAvail = isAvailable(quickProduct);
        const qMax = typeof quickProduct.stock_qty === "number" ? Math.max(1, quickProduct.stock_qty) : 99;
        return (
          <div onClick={() => setQuickProduct(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
            <div onClick={(e) => e.stopPropagation()} className="relative grid max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-neutral-200 bg-white md:grid-cols-2">
              <button type="button" onClick={() => setQuickProduct(null)} className="absolute right-3 top-3 z-10 border border-neutral-200 bg-white p-1.5 text-[#121212] hover:bg-neutral-100"><X className="h-4 w-4"></X></button>
              <div className="relative flex aspect-square items-center justify-center border-b border-neutral-200 bg-white p-4 md:border-b-0 md:border-r">
                {qSrc ? (isVideoMedia(qSrc) ? <video src={qSrc} controls playsInline className="h-full w-full object-contain"></video> : <img src={qSrc} alt={qLoc.name} className="h-full w-full object-contain"></img>) : <ImageIcon className="h-10 w-10 text-neutral-300"></ImageIcon>}
                {qMedia.length > 1 && (
                  <>
                    <button type="button" onClick={() => stepPhoto(quickProduct.id, qMedia.length, -1)} className="absolute left-3 top-1/2 -translate-y-1/2 border border-neutral-200 bg-white p-1.5"><ChevronLeft className="h-4 w-4"></ChevronLeft></button>
                    <button type="button" onClick={() => stepPhoto(quickProduct.id, qMedia.length, 1)} className="absolute right-3 top-1/2 -translate-y-1/2 border border-neutral-200 bg-white p-1.5"><ChevronRight className="h-4 w-4"></ChevronRight></button>
                  </>
                )}
              </div>
              <div className="flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">{quickProduct.category}</p>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="mt-1.5 text-3xl font-semibold text-[#121212]">{qLoc.name}</h2>
                  <p className="mt-2 text-lg font-semibold text-[#121212]">{activeRegion.symbol}{unitPrice(quickProduct).toFixed(2)}</p>
                                    {typeof quickProduct.stock_qty === "number" && (
                    <p className={`mt-1.5 text-xs font-semibold ${!qAvail ? "text-red-600" : quickProduct.stock_qty <= 5 ? "text-amber-700" : "text-emerald-700"}`}>
                      {!qAvail ? t.outOfStock : `${quickProduct.stock_qty} ${quickProduct.stock_qty <= 5 ? t.onlyLeftLabel : t.inStockLabel}`}
                    </p>
                  )}
                  <p className="mt-4 text-xs leading-relaxed text-neutral-600">{qLoc.description}</p>

                </div>
                <div className="mt-6 space-y-3 border-t border-neutral-200 pt-5">
                  <div className="inline-flex items-center border border-neutral-300">
                    <button type="button" onClick={() => setQuickQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-neutral-600"><Minus className="h-3.5 w-3.5"></Minus></button>
                    <span className="px-4 text-xs font-semibold">{quickQty}</span>
                    <button type="button" onClick={() => setQuickQty((q) => Math.min(qMax, q + 1))} className="px-3 py-2 text-neutral-600"><Plus className="h-3.5 w-3.5"></Plus></button>
                  </div>
                  <button type="button" disabled={!qAvail} onClick={() => { addToCart(quickProduct.id, quickQty); setQuickProduct(null); }} className="flex w-full items-center justify-center gap-2 bg-[#121212] py-3.5 text-xs font-medium tracking-widest text-white uppercase hover:bg-neutral-800 disabled:opacity-40 transition">
                    <Check className="h-4 w-4"></Check>
                    <span>{qAvail ? t.addToBag : t.outOfStock}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} region={region} cartItems={cartItems} subtotal={subtotal} deliveryFee={deliveryFee} total={total} onUpdateQty={updateQty} onSubmitOrder={handleOrderSubmit}></CartDrawer>
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} authed={adminAuthed} setAuthed={setAdminAuthed} region={region} onSwitchRegion={adminSwitchRegion} products={products} orders={orders} heroConfig={heroConfig} onSaveHero={saveHeroConfig} onSaveProduct={saveProduct} onDeleteProduct={deleteProduct} onUpdateOrderStatus={updateOrderStatus} onDeleteOrder={deleteOrder} onToast={showToast}></AdminPanel>

      <div role="contentinfo" className="border-t border-neutral-200 bg-[#F6F5F3] px-4 py-12 text-xs text-neutral-600 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2">
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl font-semibold tracking-[0.22em] text-[#121212] uppercase">AMVISAT</p>
            <p className="mt-2.5 max-w-sm leading-relaxed text-neutral-500">{t.footerDesc}</p>
          </div>
          <div className="flex flex-col justify-between sm:items-end">
            <p className="font-medium text-[#121212]">{activeRegion.flag} {activeRegion.name} · {activeRegion.paymentLabel}</p>
            <p className="mt-4 text-[11px] text-neutral-400">© {new Date().getFullYear()} AMVISAT. All rights reserved.</p>
          </div>
        </div>
      </div>

      {toastMsg && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 bg-[#121212] px-5 py-3 text-xs font-medium tracking-wider text-white uppercase shadow-lg">{toastMsg}</div>}
    </div>
  );
}

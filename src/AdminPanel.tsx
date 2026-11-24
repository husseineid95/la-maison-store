import { useRef, useState } from "react";
import { ShieldCheck, Package, Bell, Edit3, Trash2, Globe, Lock, LogOut, X, Image as ImageIcon, Film } from "lucide-react";
import { REGIONS, getProductImages, isVideoMedia, type Product, type RegionCode, type StoreOrder } from "./storeData";
import { AdminProductForm } from "./AdminProductForm";

const ADMIN_PASSCODE = "maison2026";
export interface HeroBannerConfig {
  image?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
}

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  authed: boolean;
  setAuthed: (v: boolean) => void;
  region: RegionCode;
  onSwitchRegion: (r: RegionCode) => void;
  products: Product[];
  orders: StoreOrder[];
    heroConfig: HeroBannerConfig;
  onSaveHero: (cfg: HeroBannerConfig) => Promise<void>;
  
  onSaveProduct: (item: Product, isEdit: boolean) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onUpdateOrderStatus: (id: string, status: StoreOrder["status"]) => Promise<void>;
  onToast: (msg: string) => void;
}

export function AdminPanel({
  open, onClose, authed, setAuthed, region, onSwitchRegion, products, orders, onSaveProduct, onDeleteProduct, onUpdateOrderStatus, onToast,
}: AdminPanelProps) {
  const [passInput, setPassInput] = useState("");
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  function startEdit(p: Product) {
    setEditingProduct(p);
    setTab("products");
    setTimeout(() => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] px-6 py-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#B45309]" /><h2 className="text-xl font-bold">Amvisat Admin
</h2></div>
          <div className="flex items-center gap-2">
            {authed && <button type="button" onClick={() => setAuthed(false)} className="inline-flex items-center gap-1 rounded-full border border-[#E7E2DA] px-3 py-1 text-xs font-medium text-[#57534E]"><LogOut className="h-3.5 w-3.5" /> Lock</button>}
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#57534E] hover:bg-[#F3EFE8]"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {!authed ? (
          <form onSubmit={(e) => { e.preventDefault(); if (passInput === ADMIN_PASSCODE) { setAuthed(true); setPassInput(""); } else { onToast("Incorrect admin passcode"); } }} className="mx-auto my-12 w-full max-w-xs space-y-4 px-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-[#B45309]" />
            <h3 className="text-lg font-bold">Enter Admin Passcode</h3>
            <input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} placeholder="Passcode" className="w-full rounded-xl border border-[#E7E2DA] px-4 py-2.5 text-center text-sm focus:border-[#1C1917] focus:outline-none" />
            <button type="submit" className="w-full rounded-full bg-[#1C1917] py-2.5 text-xs font-bold text-white">Unlock Admin Panel</button>
          </form>
        ) : (
          <div ref={bodyRef} className="flex-1 overflow-y-auto p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] px-4 py-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#57534E]"><Globe className="h-4 w-4 text-[#B45309]" /> Storefront Country View (Admin Only):</span>
              <div className="flex gap-1.5">
                {(["LB", "FR", "DE"] as RegionCode[]).map((code) => (
                  <button key={code} type="button" onClick={() => onSwitchRegion(code)} className={`rounded-full px-3 py-1 font-bold transition ${region === code ? "bg-[#1C1917] text-white" : "border border-[#E7E2DA] bg-white text-[#57534E]"}`}>
                    {REGIONS[code].flag} {REGIONS[code].name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 flex gap-2 border-b border-[#E7E2DA] pb-3">
              <button type="button" onClick={() => setTab("orders")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${tab === "orders" ? "bg-[#1C1917] text-white" : "bg-[#F3EFE8] text-[#57534E]"}`}><Bell className="h-3.5 w-3.5" /> Customer Orders ({orders.length})</button>
              <button type="button" onClick={() => setTab("products")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${tab === "products" ? "bg-[#1C1917] text-white" : "bg-[#F3EFE8] text-[#57534E]"}`}><Package className="h-3.5 w-3.5" /> Manage Products ({products.length})</button>
            </div>

            {tab === "orders" ? (
              <div className="space-y-4">
                {orders.length === 0 ? <p className="py-10 text-center text-sm text-[#78716C]">No orders received yet.</p> : orders.map((ord) => (
                  <div key={ord.id} className="rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">#{ord.id.slice(-6).toUpperCase()} · {ord.customer_name}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 font-semibold">{REGIONS[ord.region].flag} {ord.region}</span>
                        <span className={`rounded-full px-2.5 py-0.5 font-bold capitalize ${ord.status === "pending" ? "bg-[#FEF3C7] text-[#B45309]" : ord.status === "confirmed" ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#DCFCE7] text-[#15803D]"}`}>{ord.status}</span>
                      </div>
                      <span className="text-[#78716C]">{new Date(ord.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-[#57534E]">Phone: <strong>{ord.customer_phone}</strong> · Address: <strong>{ord.city}, {ord.address}</strong>{ord.notes ? ` · Notes: ${ord.notes}` : ""}</p>
                    <div className="mt-2 space-y-1 rounded-xl bg-white p-3">
                                            {ord.items.map((it, idx) => {
                        const prod = products.find((p) => p.id === it.id);
                        const thumb = prod ? (getProductImages(prod)[0] || "") : "";
                        const sym = ord.currency === "EUR" ? "€" : "$";
                        return (
                          <div key={idx} className="flex items-center justify-between gap-3 py-1">
                            <div className="flex min-w-0 items-center gap-2.5">
                              {thumb ? (
                                isVideoMedia(thumb) ? (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1C1917] text-white"><Film className="h-4 w-4" /></div>
                                ) : (
                                  <div style={{ backgroundImage: `url(${thumb})` }} className="h-10 w-10 shrink-0 rounded-lg border border-[#E7E2DA] bg-cover bg-center" />
                                )
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFECE6] text-[#A8A29E]"><ImageIcon className="h-4 w-4" /></div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-bold text-[#1C1917]">{it.name}</p>
                                <p className="text-[11px] text-[#78716C]">{prod ? `${prod.category} · ` : ""}{it.qty} × {sym}{it.unitPrice.toFixed(2)}</p>
                              </div>
                            </div>
                            <span className="shrink-0 font-bold text-[#1C1917]">{sym}{(it.unitPrice * it.qty).toFixed(2)}</span>
                          </div>
                        );
                      })}

                      <div className="flex justify-between border-t border-[#F3EFE8] pt-1 text-[#57534E]"><span>Delivery</span><span>{ord.delivery_fee === 0 ? "FREE" : (ord.currency === "EUR" ? "€" : "$") + ord.delivery_fee.toFixed(2)}</span></div>
                      <div className="flex justify-between border-t border-[#F3EFE8] pt-1.5 font-bold"><span>Total ({REGIONS[ord.region].paymentLabel})</span><span>{(ord.currency === "EUR" ? "€" : "$") + ord.total.toFixed(2)}</span></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void onUpdateOrderStatus(ord.id, "confirmed")} className="rounded-full bg-[#1D4ED8] px-3 py-1.5 font-semibold text-white">Mark Confirmed</button>
                      <button type="button" onClick={() => void onUpdateOrderStatus(ord.id, "delivered")} className="rounded-full bg-[#15803D] px-3 py-1.5 font-semibold text-white">Mark Delivered</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
                <details className="mb-6 rounded-2xl border border-[#E7E2DA] bg-[#FAF9F6] p-4">
  <summary className="cursor-pointer text-xs font-bold tracking-wider text-[#1C1917] uppercase">Hero Banner & Brand Message</summary>
  <div className="mt-4 space-y-3 text-xs">
    <div className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer rounded-xl border border-[#1C1917] bg-white px-3.5 py-2 font-semibold text-[#1C1917] hover:bg-[#1C1917] hover:text-white transition">
        Upload Banner Photo
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const img = new Image();
            const reader = new FileReader();
            reader.onload = () => {
              img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxW = 1200;
                const scale = Math.min(1, maxW / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
                void onSaveHero({ ...heroConfig, image: canvas.toDataURL("image/jpeg", 0.85) });
              };
              img.src = String(reader.result || "");
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {heroConfig.image && (
        <button type="button" onClick={() => void onSaveHero({ ...heroConfig, image: "" })} className="rounded-xl border border-red-200 bg-white px-3 py-2 font-semibold text-red-600">Remove Photo</button>
      )}
    </div>
    <input defaultValue={heroConfig.eyebrow || ""} onBlur={(e) => void onSaveHero({ ...heroConfig, eyebrow: e.target.value })} placeholder="Top Tag (e.g. AMVISAT · HOME & DAILY CARE)" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2.5" />
    <input defaultValue={heroConfig.title || ""} onBlur={(e) => void onSaveHero({ ...heroConfig, title: e.target.value })} placeholder="Main Headline (e.g. Thoughtful essentials for every corner of home.)" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2.5" />
    <textarea rows={2} defaultValue={heroConfig.subtitle || ""} onBlur={(e) => void onSaveHero({ ...heroConfig, subtitle: e.target.value })} placeholder="Brand Message / Subtitle" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2.5" />
  </div>
</details>
                
                <AdminProductForm editingProduct={editingProduct} onCancelEdit={() => setEditingProduct(null)} onSaveProduct={onSaveProduct} onToast={onToast} />
                <div className="space-y-2.5">
                  {products.length === 0 ? <p className="py-8 text-center text-xs text-[#78716C]">No products added yet. Add your first item using the form!</p> : products.map((prod) => {
                    const media = getProductImages(prod);
                    const cover = media[0] || "";
                    return (
                      <div key={prod.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E2DA] p-3 text-xs">
                        {cover ? (
                          isVideoMedia(cover) ? (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1C1917] text-white"><Film className="h-4 w-4" /></div>
                          ) : (
                            <div style={{ backgroundImage: `url(${cover})` }} className="h-12 w-12 rounded-lg bg-cover bg-center" />
                          )
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EFECE6] text-[#A8A29E]"><ImageIcon className="h-4 w-4" /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{prod.name}</p>
                          <p className="text-[#78716C]">{prod.category} · ${prod.price_lb} / €{prod.price_eu} · {media.length} file{media.length === 1 ? "" : "s"} · {prod.regions.join(", ")}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => startEdit(prod)} className="rounded-lg border border-[#E7E2DA] p-2 hover:bg-[#F3EFE8]"><Edit3 className="h-3.5 w-3.5" /></button>
                                            <button type="button" onClick={() => void onDeleteProduct(prod.id)} className="rounded-lg border border-[#E7E2DA] p-2 text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

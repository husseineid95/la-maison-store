import { useState } from "react";
import { ShieldCheck, Package, Bell, Edit3, Trash2, Globe, Lock, LogOut, X, Image as ImageIcon } from "lucide-react";
import { ADMIN_CATEGORIES, REGIONS, type Product, type ProductCategory, type RegionCode, type StoreOrder } from "./storeData";

const ADMIN_PASSCODE = "maison2026";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  authed: boolean;
  setAuthed: (v: boolean) => void;
  region: RegionCode;
  onSwitchRegion: (r: RegionCode) => void;
  products: Product[];
  orders: StoreOrder[];
  onSaveProduct: (item: Product, isEdit: boolean) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onUpdateOrderStatus: (id: string, status: StoreOrder["status"]) => Promise<void>;
  onToast: (msg: string) => void;
}

export function AdminModal({
  open, onClose, authed, setAuthed, region, onSwitchRegion, products, orders, onSaveProduct, onDeleteProduct, onUpdateOrderStatus, onToast,
}: AdminModalProps) {
  const [passInput, setPassInput] = useState("");
  const [tab, setTab] = useState<"orders" | "products">("orders");
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

  if (!open) return null;

  function startEdit(p: Product) {
    setEditingId(p.id); setPName(p.name); setPCat(p.category); setPDesc(p.description);
    setPPriceLb(String(p.price_lb)); setPPriceEu(String(p.price_eu)); setPImg(p.image_url);
    setPBadge(p.badge || ""); setPRegions(p.regions); setPInStock(p.in_stock); setTab("products");
  }

  function resetForm() {
    setEditingId(null); setPName(""); setPCat("Kitchenware"); setPDesc("");
    setPPriceLb(""); setPPriceEu(""); setPImg(""); setPBadge(""); setPRegions(["LB"]); setPInStock(true);
  }

  function toggleRegion(code: RegionCode) {
    setPRegions((prev) => prev.includes(code) ? (prev.length > 1 ? prev.filter((r) => r !== code) : prev) : [...prev, code]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!pName.trim() || !pPriceLb) return;
    await onSaveProduct({
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
    }, Boolean(editingId));
    resetForm();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] px-6 py-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#B45309]" /><h2 className="text-xl font-bold">La Maison Admin</h2></div>
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
          <div className="flex-1 overflow-y-auto p-6">
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
                    <p className="mt-2 text-[#57534E]">📞 <strong>{ord.customer_phone}</strong> · 📍 {ord.city}, {ord.address}{ord.notes ? ` (${ord.notes})` : ""}</p>
                    <div className="mt-2 space-y-1 rounded-xl bg-white p-3">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between"><span>{it.qty}× {it.name}</span><span className="font-semibold">{(ord.currency === "EUR" ? "€" : "$") + (it.unitPrice * it.qty).toFixed(2)}</span></div>
                      ))}
                      <div className="flex justify-between border-t border-[#F3EFE8] pt-1.5 font-bold"><span>Total</span><span>{(ord.currency === "EUR" ? "€" : "$") + ord.total.toFixed(2)}</span></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void onUpdateOrderStatus(ord.id, "confirmed")} className="rounded-full bg-[#1D4ED8] px-3 py-1.5 font-semibold text-white">Mark Confirmed</button>
                      <button type="button" onClick={() => void onUpdateOrderStatus(ord.id, "delivered")} className="rounded-full bg-[#15803D] px-3 py-1.5 font-semibold text-white">Mark Delivered</button>
                      <a href={`https://wa.me{ord.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-full border border-[#E7E2DA] bg-white px-3 py-1.5 font-semibold text-[#1C1917]">Message Buyer on WhatsApp</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <form onSubmit={(e) => void handleSave(e)} className="space-y-3 rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 text-xs">
                  <h3 className="text-sm font-bold">{editingId ? "Edit Product" : "Add New Product"}</h3>
                  <input required value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Product Name *" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />
                  <select value={pCat} onChange={(e) => setPCat(e.target.value as ProductCategory)} className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2">
                    {ADMIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  

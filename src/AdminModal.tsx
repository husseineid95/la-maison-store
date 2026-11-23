import { useState } from "react";
import { ShieldCheck, Package, Bell, Edit3, Trash2, Globe, Lock, LogOut, X, Image as ImageIcon, Upload, Star } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { ADMIN_CATEGORIES, LANGUAGES, REGIONS, getProductImages, type LangCode, type LocalizedText, type Product, type ProductCategory, type RegionCode, type StoreOrder } from "./storeData";

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
  const [editLang, setEditLang] = useState<LangCode>("en");

  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pTrans, setPTrans] = useState<Partial<Record<LangCode, LocalizedText>>>({});
  const [pCat, setPCat] = useState<ProductCategory>("Kitchenware");
  const [pPriceLb, setPPriceLb] = useState("");
  const [pPriceEu, setPPriceEu] = useState("");
  const [pImages, setPImages] = useState<string[]>([]);
  const [pUrlInput, setPUrlInput] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pBadge, setPBadge] = useState("");
  const [pRegions, setPRegions] = useState<RegionCode[]>(["LB"]);
  const [pInStock, setPInStock] = useState(true);

  if (!open) return null;

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditLang("en");
    setPName(p.name);
    setPDesc(p.description);
    setPTrans(p.translations || {});
    setPCat(p.category);
    setPPriceLb(String(p.price_lb));
    setPPriceEu(String(p.price_eu));
    setPImages(getProductImages(p));
    setPUrlInput("");
    setPBadge(p.badge || "");
    setPRegions(p.regions);
    setPInStock(p.in_stock);
    setTab("products");
  }

  function resetForm() {
    setEditingId(null); setEditLang("en"); setPName(""); setPDesc(""); setPTrans({});
    setPCat("Kitchenware"); setPPriceLb(""); setPPriceEu(""); setPImages([]);
    setPUrlInput(""); setPBadge(""); setPRegions(["LB"]); setPInStock(true);
  }

  function toggleRegion(code: RegionCode) {
    setPRegions((prev) => prev.includes(code) ? (prev.length > 1 ? prev.filter((r) => r !== code) : prev) : [...prev, code]);
  }

  function currentNameValue() {
    return editLang === "en" ? pName : (pTrans[editLang]?.name || "");
  }

  function currentDescValue() {
    return editLang === "en" ? pDesc : (pTrans[editLang]?.description || "");
  }

  function updateLocalizedField(field: "name" | "description", val: string) {
    if (editLang === "en") {
      if (field === "name") setPName(val);
      else setPDesc(val);
    } else {
      setPTrans((prev) => ({
        ...prev,
        [editLang]: { ...(prev[editLang] || {}), [field]: val },
      }));
    }
  }

  async function handlePhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    const added: string[] = [];

    for (const file of Array.from(files)) {
      if (isSupabaseConfigured && supabase) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("product-photos").upload(path, file, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
          if (data?.publicUrl) added.push(data.publicUrl);
        }
      } else {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.readAsDataURL(file);
        });
        if (dataUrl) added.push(dataUrl);
      }
    }

    setPImages((prev) => [...prev, ...added]);
    setUploadingPhotos(false);
    if (added.length > 0) onToast(`${added.length} photo${added.length > 1 ? "s" : ""} added`);
  }

  function addPhotoUrl() {
    if (!pUrlInput.trim()) return;
    setPImages((prev) => [...prev, pUrlInput.trim()]);
    setPUrlInput("");
  }

  function makeCoverPhoto(idx: number) {
    if (idx === 0) return;
    setPImages((prev) => {
      const copy = [...prev];
      const [picked] = copy.splice(idx, 1);
      return [picked, ...copy];
    });
  }

  function removePhoto(idx: number) {
    setPImages((prev) => prev.filter((_, i) => i !== idx));
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
      image_url: pImages[0] || "",
      images: pImages,
      translations: pTrans,
      regions: pRegions,
      badge: pBadge.trim() || undefined,
      in_stock: pInStock,
    }, Boolean(editingId));
    resetForm();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
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
              <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
                <form onSubmit={(e) => void handleSave(e)} className="space-y-3 rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{editingId ? "Edit Product" : "Add New Product"}</h3>
                    <div className="flex gap-1">
                      {(["en", "ar", "fr", "de"] as LangCode[]).map((l) => (
                        <button key={l} type="button" onClick={() => setEditLang(l)} className={`rounded-md px-2 py-1 text-[11px] font-bold ${editLang === l ? "bg-[#1C1917] text-white" : "border border-[#E7E2DA] bg-white text-[#57534E]"}`}>
                          {LANGUAGES[l].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input required={editLang === "en"} dir={LANGUAGES[editLang].dir} value={currentNameValue()} onChange={(e) => updateLocalizedField("name", e.target.value)} placeholder={editLang === "en" ? "Product Name (English) *" : `Product Name (${LANGUAGES[editLang].label} - optional)`} className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />
                  <textarea rows={2} dir={LANGUAGES[editLang].dir} value={currentDescValue()} onChange={(e) => updateLocalizedField("description", e.target.value)} placeholder={editLang === "en" ? "Short product description (English)" : `Description (${LANGUAGES[editLang].label} - optional)`} className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />

                  <select value={pCat} onChange={(e) => setPCat(e.target.value as ProductCategory)} className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2">
                    {ADMIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input required type="number" step="0.01" value={pPriceLb} onChange={(e) => setPPriceLb(e.target.value)} placeholder="Lebanon Price ($ USD) *" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />
                    <input type="number" step="0.01" value={pPriceEu} onChange={(e) => setPPriceEu(e.target.value)} placeholder="France/Germany (€ EUR)" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />
                  </div>
                                    <div className="space-y-2 rounded-xl border border-[#E7E2DA] bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#57534E]">Product Photos ({pImages.length})</span>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1C1917] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#292524]">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{uploadingPhotos ? "Uploading..." : "Upload from Gallery"}</span>
                        <input type="file" accept="image/*" multiple disabled={uploadingPhotos} onChange={(e) => void handlePhotoFiles(e.target.files)} className="hidden" />
                      </label>
                    </div>
                    <div className="flex gap-1.5">
                      <input value={pUrlInput} onChange={(e) => setPUrlInput(e.target.value)} placeholder="Or paste image URL (https://...)" className="flex-1 rounded-lg border border-[#E7E2DA] px-2.5 py-1.5 text-[11px]" />
                      <button type="button" onClick={addPhotoUrl} className="rounded-lg border border-[#E7E2DA] px-2.5 py-1.5 text-[11px] font-semibold">Add URL</button>
                    </div>

                    {pImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {pImages.map((img, idx) => (
                          <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-[#E7E2DA]">
                            <img src={img} alt="" className="h-full w-full object-cover" />
                            {idx === 0 ? (
                              <span className="absolute bottom-1 left-1 rounded bg-[#1C1917]/85 px-1.5 py-0.5 text-[9px] font-bold text-white">Cover</span>
                            ) : (
                              <button type="button" onClick={() => makeCoverPhoto(idx)} title="Set as cover" className="absolute bottom-1 left-1 rounded bg-white/90 p-1 text-[#1C1917]"><Star className="h-2.5 w-2.5" /></button>
                            )}
                            <button type="button" onClick={() => removePhoto(idx)} className="absolute right-1 top-1 rounded bg-[#DC2626] p-1 text-white"><X className="h-2.5 w-2.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <input value={pBadge} onChange={(e) => setPBadge(e.target.value)} placeholder="Badge (optional, e.g. Best Seller, New)" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />

                  <div>
                    <p className="mb-1.5 font-semibold text-[#57534E]">Visible Countries:</p>
                    <div className="flex gap-2">
                      {(["LB", "FR", "DE"] as RegionCode[]).map((code) => (
                        <button key={code} type="button" onClick={() => toggleRegion(code)} className={`rounded-lg border px-3 py-1.5 font-semibold ${pRegions.includes(code) ? "border-[#1C1917] bg-[#1C1917] text-white" : "border-[#E7E2DA] bg-white text-[#57534E]"}`}>{REGIONS[code].flag} {code}</button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={pInStock} onChange={(e) => setPInStock(e.target.checked)} /> In Stock & Available</label>

                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={uploadingPhotos} className="flex-1 rounded-full bg-[#1C1917] py-2.5 font-bold text-white disabled:opacity-50">{editingId ? "Update Product" : "Add Product"}</button>
                    {editingId && <button type="button" onClick={resetForm} className="rounded-full border border-[#E7E2DA] bg-white px-4 py-2.5 font-semibold">Cancel</button>}
                  </div>
                </form>

                <div className="space-y-2.5">
                  {products.length === 0 ? <p className="py-8 text-center text-xs text-[#78716C]">No products added yet. Add your first item using the form!</p> : products.map((prod) => {
                    const imgs = getProductImages(prod);
                    return (
                      <div key={prod.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E2DA] p-3 text-xs">
                        {imgs[0] ? <img src={imgs[0]} alt={prod.name} className="h-12 w-12 rounded-lg object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EFECE6] text-[#A8A29E]"><ImageIcon className="h-4 w-4" /></div>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{prod.name}</p>
                          <p className="text-[#78716C]">{prod.category} · ${prod.price_lb} / €{prod.price_eu} · {imgs.length} photo{imgs.length === 1 ? "" : "s"} · {prod.regions.join(", ")}</p>
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


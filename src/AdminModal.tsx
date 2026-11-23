import { useRef, useState } from "react";
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
  const bodyRef = useRef<HTMLDivElement>(null);
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
    setTimeout(() => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
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
        } else {
          onToast(`Upload error: ${error.message}`);
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
                        

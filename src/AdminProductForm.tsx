import { useEffect, useState } from "react";
import { Upload, Star, X, Film } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { ADMIN_CATEGORIES, LANGUAGES, REGIONS, getProductImages, isVideoMedia, type LangCode, type LocalizedText, type Product, type ProductCategory, type RegionCode } from "./storeData";

interface AdminProductFormProps {
  editingProduct: Product | null;
  onCancelEdit: () => void;
  onSaveProduct: (item: Product, isEdit: boolean) => Promise<void>;
  onToast: (msg: string) => void;
}

export function AdminProductForm({ editingProduct, onCancelEdit, onSaveProduct, onToast }: AdminProductFormProps) {
  const [editLang, setEditLang] = useState<LangCode>("en");
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pTrans, setPTrans] = useState<Partial<Record<LangCode, LocalizedText>>>({});
  const [pCat, setPCat] = useState<ProductCategory>("Kitchenware");
  const [pPriceLb, setPPriceLb] = useState("");
  const [pPriceEu, setPPriceEu] = useState("");
  const [pMedia, setPMedia] = useState<string[]>([]);
  const [pUrlInput, setPUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pBadge, setPBadge] = useState("");
  const [pRegions, setPRegions] = useState<RegionCode[]>(["LB"]);
  const [pInStock, setPInStock] = useState(true);

  useEffect(() => {
    if (editingProduct) {
      setEditLang("en");
      setPName(editingProduct.name);
      setPDesc(editingProduct.description);
      setPTrans(editingProduct.translations || {});
      setPCat(editingProduct.category);
      setPPriceLb(String(editingProduct.price_lb));
      setPPriceEu(String(editingProduct.price_eu));
      setPMedia(getProductImages(editingProduct));
      setPUrlInput("");
      setPBadge(editingProduct.badge || "");
      setPRegions(editingProduct.regions);
      setPInStock(editingProduct.in_stock);
    } else {
      resetForm();
    }
  }, [editingProduct]);

  function resetForm() {
    setEditLang("en"); setPName(""); setPDesc(""); setPTrans({});
    setPCat("Kitchenware"); setPPriceLb(""); setPPriceEu(""); setPMedia([]);
    setPUrlInput(""); setPBadge(""); setPRegions(["LB"]); setPInStock(true);
  }

  function toggleRegion(code: RegionCode) {
    setPRegions((prev) => prev.includes(code) ? (prev.length > 1 ? prev.filter((r) => r !== code) : prev) : [...prev, code]);
  }

  function currentName() { return editLang === "en" ? pName : (pTrans[editLang]?.name || ""); }
  function currentDesc() { return editLang === "en" ? pDesc : (pTrans[editLang]?.description || ""); }

  function updateLocalized(field: "name" | "description", val: string) {
    if (editLang === "en") {
      if (field === "name") setPName(val); else setPDesc(val);
    } else {
      setPTrans((prev) => ({ ...prev, [editLang]: { ...(prev[editLang] || {}), [field]: val } }));
    }
  }
    async function handleMediaFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: string[] = [];

    for (const file of Array.from(files)) {
      let url = "";
      if (isSupabaseConfigured && supabase) {
        const ext = file.name.split(".").pop() || (file.type.startsWith("video/") ? "mp4" : "jpg");
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("product-photos").upload(path, file, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
          if (data?.publicUrl) url = data.publicUrl;
        }
      }
      if (!url && file.type.startsWith("image/")) {
        url = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, 900 / Math.max(img.width, img.height));
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          };
          img.onerror = () => resolve("");
          img.src = URL.createObjectURL(file);
        });
      }
      if (!url && file.type.startsWith("video/")) {
        url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
      }
      if (url) added.push(url);
    }

    setPMedia((prev) => [...prev, ...added]);
    setUploading(false);
    if (added.length > 0) onToast(`${added.length} file${added.length > 1 ? "s" : ""} attached`);
  }

  function addMediaUrl() {
    if (!pUrlInput.trim()) return;
    setPMedia((prev) => [...prev, pUrlInput.trim()]);
    setPUrlInput("");
  }

  function makeCover(idx: number) {
    if (idx === 0) return;
    setPMedia((prev) => { const copy = [...prev]; const [picked] = copy.splice(idx, 1); return [picked, ...copy]; });
  }

  function removeMedia(idx: number) {
    setPMedia((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pName.trim() || !pPriceLb) return;
    await onSaveProduct({
      id: editingProduct?.id || `prod-${Date.now()}`,
      name: pName.trim(),
      category: pCat,
      description: pDesc.trim() || "Curated quality essential from La Maison.",
      price_lb: Number(pPriceLb),
      price_eu: Number(pPriceEu || pPriceLb),
      image_url: pMedia[0] || "",
      images: pMedia,
      translations: pTrans,
      regions: pRegions,
      badge: pBadge.trim() || undefined,
      in_stock: pInStock,
    }, Boolean(editingProduct));
    if (editingProduct) onCancelEdit();
    resetForm();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 rounded-2xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
        <div className="flex gap-1">
          {(["en", "ar", "fr", "de"] as LangCode[]).map((l) => (
            <button key={l} type="button" onClick={() => setEditLang(l)} className={`rounded-md px-2 py-1 text-[11px] font-bold ${editLang === l ? "bg-[#1C1917] text-white" : "border border-[#E7E2DA] bg-white text-[#57534E]"}`}>
              {LANGUAGES[l].label}
            </button>
          ))}
        </div>
      </div>

      <input required={editLang === "en"} dir={LANGUAGES[editLang].dir} value={currentName()} onChange={(e) => updateLocalized("name", e.target.value)} placeholder={editLang === "en" ? "Product Name (English) *" : `Product Name (${LANGUAGES[editLang].label} - optional)`} className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />
      <textarea rows={2} dir={LANGUAGES[editLang].dir} value={currentDesc()} onChange={(e) => updateLocalized("description", e.target.value)} placeholder={editLang === "en" ? "Short product description (English)" : `Description (${LANGUAGES[editLang].label} - optional)`} className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />

      <select value={pCat} onChange={(e) => setPCat(e.target.value as ProductCategory)} className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2">
        {ADMIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <input required type="number" step="0.01" value={pPriceLb} onChange={(e) => setPPriceLb(e.target.value)} placeholder="Lebanon Price ($ USD) *" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />
        <input type="number" step="0.01" value={pPriceEu} onChange={(e) => setPPriceEu(e.target.value)} placeholder="France/Germany (€ EUR)" className="w-full rounded-xl border border-[#E7E2DA] bg-white px-3 py-2" />
      </div>

      <div className="space-y-2 rounded-xl border border-[#E7E2DA] bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-[#57534E]">Photos & Videos ({pMedia.length})</span>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1C1917] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#292524]">
            <Upload className="h-3.5 w-3.5" />
            <span>{uploading ? "Uploading..." : "Photos / Videos"}</span>
            <input type="file" accept="image/*,video/*" multiple disabled={uploading} onChange={(e) => void handleMediaFiles(e.target.files)} className="hidden" />
          </label>
        </div>
        <div className="flex gap-1.5">
          <input value={pUrlInput} onChange={(e) => setPUrlInput(e.target.value)} placeholder="Or paste photo/video URL (https://...)" className="flex-1 rounded-lg border border-[#E7E2DA] px-2.5 py-1.5 text-[11px]" />
          <button type="button" onClick={addMediaUrl} className="rounded-lg border border-[#E7E2DA] px-2.5 py-1.5 text-[11px] font-semibold">Add URL</button>
        </div>
        {pMedia.length > 0 && (
          <div className="grid grid-cols-4 gap-2 pt-1">
            {pMedia.map((src, idx) => (
              <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-[#E7E2DA] bg-black">
                {isVideoMedia(src) ? (
                  <>
                    <video src={src} muted playsInline className="h-full w-full object-cover" />
                    <span className="absolute right-1 bottom-1 rounded bg-black/75 p-0.5 text-white"><Film className="h-2.5 w-2.5" /></span>
                  </>
                ) : (
                  <div style={{ backgroundImage: `url(${src})` }} className="h-full w-full bg-cover bg-center" />
                )}
                {idx === 0 ? <span className="absolute bottom-1 left-1 rounded bg-[#1C1917]/85 px-1.5 py-0.5 text-[9px] font-bold text-white">Cover</span> : <button type="button" onClick={() => makeCover(idx)} className="absolute bottom-1 left-1 rounded bg-white/90 p-1 text-[#1C1917]"><Star className="h-2.5 w-2.5" /></button>}
                <button type="button" onClick={() => removeMedia(idx)} className="absolute right-1 top-1 rounded bg-[#DC2626] p-1 text-white"><X className="h-2.5 w-2.5" /></button>
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
        <button type="submit" disabled={uploading} className="flex-1 rounded-full bg-[#1C1917] py-2.5 font-bold text-white disabled:opacity-50">{editingProduct ? "Update Product" : "Add Product"}</button>
        {editingProduct && <button type="button" onClick={() => { onCancelEdit(); resetForm(); }} className="rounded-full border border-[#E7E2DA] bg-white px-4 py-2.5 font-semibold">Cancel</button>}
      </div>
    </form>
  );
              }
            

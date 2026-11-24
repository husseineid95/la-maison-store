import { useState } from "react";
import { ShoppingBag, Plus, Minus, Trash2, X, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { REGIONS, isVideoMedia, type Product, type RegionCode, type StoreOrder } from "./storeData";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  region: RegionCode;
  cartItems: { product: Product; qty: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  onUpdateQty: (id: string, delta: number) => void;
  onSubmitOrder: (details: { name: string; phone: string; city: string; address: string; notes: string }) => Promise<StoreOrder | null>;
}

export function CartDrawer({
  open, onClose, region, cartItems, subtotal, deliveryFee, total, onUpdateQty, onSubmitOrder,
}: CartDrawerProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<StoreOrder | null>(null);

  if (!open) return null;
  const activeRegion = REGIONS[region];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const created = await onSubmitOrder({ name, phone, city, address, notes });
    setBusy(false);
    if (created) {
      setPlacedOrder(created);
      setName(""); setPhone(""); setCity(""); setAddress(""); setNotes("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] px-5 py-4">
          <div>
            <h2 className="text-xl font-bold">Your Shopping Bag</h2>
            <p className="text-xs text-[#78716C]">{activeRegion.flag} {activeRegion.name} · {activeRegion.paymentLabel}</p>
          </div>
          <button type="button" onClick={() => { setPlacedOrder(null); onClose(); }} className="rounded-full p-2 text-[#57534E] hover:bg-[#F3EFE8]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {placedOrder ? (
            <div className="space-y-4 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-6 text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-[#16A34A]" />
              <h3 className="text-lg font-bold text-[#14532D]">Order Placed Successfully!</h3>
              <p className="text-xs leading-relaxed text-[#166534]">
                Thank you, <strong>{placedOrder.customer_name}</strong>! Your order <strong>#{placedOrder.id.slice(-6).toUpperCase()}</strong> has been sent directly to Amvisat.
. We will prepare and confirm your delivery shortly.
              </p>
              <button type="button" onClick={() => { setPlacedOrder(null); onClose(); }} className="mt-2 rounded-full bg-[#1C1917] px-6 py-2.5 text-xs font-bold text-white">
                Continue Shopping
              </button>
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
                  <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] p-3">
                    {product.image_url ? (
                      isVideoMedia(product.image_url) ? (
                        <video src={product.image_url} muted playsInline className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <img src={product.image_url} alt={product.name} className="h-14 w-14 rounded-lg object-cover" />
                      )
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#EFECE6] text-[#A8A29E]"><ImageIcon className="h-5 w-5" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{product.name}</p>
                      <p className="text-xs text-[#78716C]">{activeRegion.symbol}{price.toFixed(2)} each</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button type="button" onClick={() => onUpdateQty(product.id, -1)} className="rounded border border-[#E7E2DA] bg-white p-1"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-semibold">{qty}</span>
                        <button type="button" onClick={() => onUpdateQty(product.id, 1)} className="rounded border border-[#E7E2DA] bg-white p-1"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <button type="button" onClick={() => onUpdateQty(product.id, -qty)} className="text-[#A8A29E] hover:text-[#DC2626]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 rounded-xl border border-[#E7E2DA] bg-[#FAF8F5] p-4 text-xs">
                <div className="flex justify-between text-[#57534E]"><span>Subtotal</span><span>{activeRegion.symbol}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-[#57534E]"><span>Delivery ({activeRegion.name})</span><span>{deliveryFee === 0 ? "FREE" : `${activeRegion.symbol}${deliveryFee.toFixed(2)}`}</span></div>
                <div className="flex justify-between border-t border-[#E7E2DA] pt-2 text-sm font-bold text-[#1C1917]"><span>Total ({activeRegion.paymentLabel})</span><span>{activeRegion.symbol}{total.toFixed(2)}</span></div>
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
                <h3 className="text-sm font-bold">Delivery Details</h3>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name *" className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none" />
                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number *" className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none" />
                <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder={region === "LB" ? "Region / City (e.g. Sidon, Chouf, Beirut) *" : "City *"} className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none" />
                <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, Building, Floor *" className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none" />
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery notes (optional)" className="w-full rounded-xl border border-[#E7E2DA] px-3.5 py-2.5 text-xs focus:border-[#1C1917] focus:outline-none" />
                <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1C1917] py-3.5 text-xs font-bold text-white hover:bg-[#292524] transition">
                  <ShoppingBag className="h-4 w-4" />
                  {busy ? "Placing Order..." : `Place Order (${activeRegion.paymentLabel})`}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { X, Plus, Minus, ShoppingBag, CheckCircle2, ArrowRight, Image as ImageIcon, MessageCircle } from "lucide-react";
import { REGIONS, getProductImages, isVideoMedia, type Product, type RegionCode, type StoreOrder } from "./storeData";

const WHATSAPP_NUMBER = "96181428535";

interface CartItemEntry {
  product: Product;
  qty: number;
  price: number;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  region: RegionCode;
  cartItems: CartItemEntry[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  onUpdateQty: (id: string, delta: number) => void;
  onSubmitOrder: (details: { name: string; phone: string; city: string; address: string; notes: string }) => Promise<StoreOrder | null>;
}

function buildWhatsAppUrl(order: StoreOrder): string {
  const sym = order.currency === "EUR" ? "€" : "$";
  const ref = order.id.slice(-6).toUpperCase();
  const lines = [
    `Hello AMVISAT! I just placed order #${ref}:`,
    ``,
    ...order.items.map((it) => `• ${it.name} x${it.qty} (${sym}${(it.unitPrice * it.qty).toFixed(2)})`),
    ``,
    `Subtotal: ${sym}${order.subtotal.toFixed(2)} (+ delivery)`,
    `Name: ${order.customer_name}`,
    `Phone: ${order.customer_phone}`,
    `Address: ${order.city}, ${order.address}`,
    order.notes ? `Notes: ${order.notes}` : "",
  ].filter(Boolean);
  return `https://wa.me{WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function CartDrawer({ open, onClose, region, cartItems, subtotal, total, onUpdateQty, onSubmitOrder }: CartDrawerProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<StoreOrder | null>(null);

  if (!open) return null;
  const activeRegion = REGIONS[region];

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !city.trim() || !address.trim()) return;
    setSubmitting(true);
    const created = await onSubmitOrder({ name, phone, city, address, notes });
    setSubmitting(false);
    if (created) {
      setCompletedOrder(created);
      setName(""); setPhone(""); setCity(""); setAddress(""); setNotes("");
    }
  }

  function resetAndClose() {
    setCompletedOrder(null);
    onClose();
  }
    return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col bg-white text-[#121212] shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-[#121212]"></ShoppingBag>
            <h2 className="text-base font-medium tracking-wide uppercase">Your Cart</h2>
          </div>
          <button type="button" onClick={resetAndClose} className="p-1.5 text-neutral-500 hover:text-[#121212]"><X className="h-5 w-5"></X></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {completedOrder ? (
            <div className="my-8 border border-neutral-200 bg-neutral-50 p-7 text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-[#121212]"></CheckCircle2>
              <h3 className="mt-4 text-xl font-medium tracking-tight">Order Confirmed</h3>
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                Reference <strong>#{completedOrder.id.slice(-6).toUpperCase()}</strong> has been sent directly to <strong>AMVISAT</strong>. We will contact you shortly at <strong>{completedOrder.customer_phone}</strong> to confirm delivery.
              </p>
              <a
                href={buildWhatsAppUrl(completedOrder)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex w-full items-center justify-center gap-2 bg-[#16A34A] py-3.5 text-xs font-medium tracking-widest text-white uppercase hover:bg-[#15803D] transition"
              >
                <MessageCircle className="h-4 w-4"></MessageCircle>
                <span>Send Order via WhatsApp</span>
              </a>
              <button type="button" onClick={resetAndClose} className="mt-2.5 w-full bg-[#121212] py-3.5 text-xs font-medium tracking-widest text-white uppercase hover:bg-neutral-800 transition">Continue Shopping</button>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="my-20 text-center">
              <p className="text-base font-medium text-[#121212]">Your cart is empty</p>
              <p className="mt-1.5 text-xs text-neutral-500">Explore our collection and add essentials to begin.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-200 border-b border-neutral-200 pb-4">
                {cartItems.map(({ product, qty, price }) => {
                  const media = getProductImages(product);
                  const cover = media[0] || "";
                  return (
                    <div key={product.id} className="flex gap-4 py-4">
                      {cover && !isVideoMedia(cover) ? (
                        <img src={cover} alt={product.name} className="h-20 w-20 shrink-0 border border-neutral-200 bg-white object-contain p-1"></img>
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-400"><ImageIcon className="h-5 w-5"></ImageIcon></div>
                      )}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#121212]">{product.name}</p>
                          <p className="mt-0.5 text-xs text-neutral-500">{activeRegion.symbol}{price.toFixed(2)}</p>
                        </div>
                        <div className="mt-2 inline-flex w-fit items-center border border-neutral-300">
                          <button type="button" onClick={() => onUpdateQty(product.id, -1)} className="px-2.5 py-1 text-neutral-600 hover:text-[#121212]"><Minus className="h-3 w-3"></Minus></button>
                          <span className="px-3 text-xs font-medium">{qty}</span>
                          <button type="button" onClick={() => onUpdateQty(product.id, 1)} className="px-2.5 py-1 text-neutral-600 hover:text-[#121212]"><Plus className="h-3 w-3"></Plus></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{activeRegion.symbol}{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-neutral-500"><span>Delivery</span><span>Confirmed upon dispatch</span></div>
                <div className="flex justify-between border-t border-neutral-200 pt-3 text-sm font-semibold text-[#121212]"><span>Items Total ({activeRegion.paymentLabel})</span><span>{activeRegion.symbol}{total.toFixed(2)}</span></div>
              </div>

              <form onSubmit={handleCheckout} className="mt-6 space-y-3 border-t border-neutral-200 pt-5 text-xs">
                <h3 className="text-xs font-semibold tracking-widest text-[#121212] uppercase">Delivery Details</h3>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name *" className="w-full border border-neutral-300 bg-white px-3.5 py-3 text-xs focus:border-[#121212] focus:outline-none"></input>
                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number *" className="w-full border border-neutral-300 bg-white px-3.5 py-3 text-xs focus:border-[#121212] focus:outline-none"></input>
                <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / Region *" className="w-full border border-neutral-300 bg-white px-3.5 py-3 text-xs focus:border-[#121212] focus:outline-none"></input>
                <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, Building, Floor *" className="w-full border border-neutral-300 bg-white px-3.5 py-3 text-xs focus:border-[#121212] focus:outline-none"></input>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Order Notes (Optional)" className="w-full border border-neutral-300 bg-white px-3.5 py-3 text-xs focus:border-[#121212] focus:outline-none"></input>
                <button type="submit" disabled={submitting} className="mt-2 flex w-full items-center justify-center gap-2 bg-[#121212] py-3.5 text-xs font-medium tracking-widest text-white uppercase hover:bg-neutral-800 disabled:opacity-50 transition">
                  <span>{submitting ? "Placing Order..." : "Place Order"}</span>
                  <ArrowRight className="h-4 w-4"></ArrowRight>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

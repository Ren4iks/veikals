import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash, Plus, Minus, ArrowRight, Tag, CheckCircle, X, Truck } from "@phosphor-icons/react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Cart() {
  const { cart, update, remove } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState(null);
  const [codeErr, setCodeErr] = useState("");
  const [validating, setValidating] = useState(false);
  const [step, setStep] = useState("cart"); // cart | address
  const [address, setAddress] = useState({
    name: user?.name || "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "Latvija",
    notes: "",
  });
  const navigate = useNavigate();

  const subtotal = cart.total;
  const shipping = subtotal >= 50 ? 0 : (subtotal > 0 ? 5 : 0);
  const discountAmt = applied?.discount_amount || 0;
  const finalTotal = Math.max(0, subtotal + shipping - discountAmt);

  const applyCode = async () => {
    setCodeErr("");
    if (!codeInput.trim()) return;
    setValidating(true);
    try {
      const { data } = await api.post("/discount/validate", { code: codeInput.trim(), subtotal });
      setApplied(data);
      toast.success(`Atlaide piemērota: ${data.code}`);
    } catch (e) {
      setCodeErr(e.response?.data?.detail || "Nederīgs kods");
      setApplied(null);
    } finally {
      setValidating(false);
    }
  };

  const goToAddress = () => {
    if (!user || user === false) {
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    setStep("address");
  };

  const checkout = async (e) => {
    e?.preventDefault?.();
    if (!address.name || !address.address || !address.city) {
      toast.error("Aizpildi obligātos laukus");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        origin_url: window.location.origin,
        discount_code: applied?.code,
        shipping_address: address,
      });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Maksājumu nevarēja izveidot");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="cart-page">
      <div className="label-eyebrow">{step === "address" ? "2 no 2 · Piegādes adrese" : "1 no 2 · Grozs"}</div>
      <h1 className="font-display font-black text-5xl sm:text-6xl tracking-tighter mt-2">
        {step === "address" ? "Piegāde" : "Tavs grozs"}
      </h1>

      {cart.items.length === 0 ? (
        <div className="mt-16 text-center py-16 border border-black/10">
          <div className="text-neutral-500">Grozs ir tukšs.</div>
          <Link to="/shop" className="btn-primary mt-6 inline-flex" data-testid="empty-cart-shop-btn">Sākt iepirkties</Link>
        </div>
      ) : (
        <div className="mt-12 grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
            {step === "cart" ? (
              cart.items.map((it) => (
                <div key={it.product.id} className="flex items-center gap-4 sm:gap-6 border border-black/10 p-4" data-testid={`cart-item-${it.product.id}`}>
                  <Link to={`/product/${it.product.id}`} className="w-24 h-24 sm:w-28 sm:h-28 bg-neutral-100 flex-shrink-0">
                    <img src={it.product.image_url} alt={it.product.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="label-eyebrow">{it.product.brand || it.product.category}</div>
                    <div className="font-display font-bold text-base sm:text-lg leading-tight truncate">{it.product.name}</div>
                    <div className="text-sm text-neutral-600 mt-1">€{it.product.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center border border-black/15">
                    <button onClick={() => update(it.product.id, it.quantity - 1)} className="p-2 hover:bg-black hover:text-white" data-testid={`cart-decrease-${it.product.id}`}>
                      <Minus size={12} weight="bold" />
                    </button>
                    <div className="w-10 text-center text-sm" data-testid={`cart-qty-${it.product.id}`}>{it.quantity}</div>
                    <button onClick={() => update(it.product.id, it.quantity + 1)} className="p-2 hover:bg-black hover:text-white" data-testid={`cart-increase-${it.product.id}`}>
                      <Plus size={12} weight="bold" />
                    </button>
                  </div>
                  <button onClick={() => remove(it.product.id)} className="p-2 hover:text-red-500" data-testid={`cart-remove-${it.product.id}`}>
                    <Trash size={18} weight="duotone" />
                  </button>
                </div>
              ))
            ) : (
              <form onSubmit={checkout} className="space-y-4" data-testid="address-form">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium">Vārds, uzvārds *</label>
                    <input required value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} className="shadcn-input mt-2" data-testid="addr-name" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium">Tālrunis</label>
                    <input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} className="shadcn-input mt-2" placeholder="+371..." data-testid="addr-phone" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider font-medium">Adrese *</label>
                  <input required value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} className="shadcn-input mt-2" placeholder="Iela, mājas Nr., dzīvoklis" data-testid="addr-street" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium">Pilsēta *</label>
                    <input required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="shadcn-input mt-2" data-testid="addr-city" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium">Pasta indekss</label>
                    <input value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} className="shadcn-input mt-2" placeholder="LV-1050" data-testid="addr-postal" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium">Valsts</label>
                    <input value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} className="shadcn-input mt-2" data-testid="addr-country" />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider font-medium">Piezīmes piegādei</label>
                  <textarea rows={2} value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} className="shadcn-input mt-2" placeholder="Piem. atstāt pie durvīm" data-testid="addr-notes" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep("cart")} className="btn-secondary" data-testid="back-to-cart">Atpakaļ uz grozu</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50" data-testid="submit-checkout">
                    {submitting ? "Apstrādā..." : "Pāriet uz maksājumu"} <ArrowRight size={16} weight="bold" />
                  </button>
                </div>
              </form>
            )}
          </div>
          <aside className="lg:col-span-1">
            <div className="border border-black/10 p-6 sticky top-24">
              <div className="font-display font-bold text-xl">Kopsavilkums</div>

              {step === "cart" && (
                <div className="mt-5">
                  <label className="text-xs uppercase tracking-wider font-medium flex items-center gap-1.5">
                    <Tag size={12} weight="duotone" /> Atlaides kods
                  </label>
                  {applied ? (
                    <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 text-sm" data-testid="applied-code">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle size={14} weight="fill" /> <strong>{applied.code}</strong> piemērots
                      </div>
                      <button onClick={() => { setApplied(null); setCodeInput(""); }} className="hover:text-red-500" data-testid="remove-code-btn">
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        placeholder="VEIKALS10"
                        className="shadcn-input text-sm flex-1"
                        data-testid="discount-code-input"
                      />
                      <button onClick={applyCode} disabled={validating || !codeInput.trim()} className="px-4 bg-black text-white text-xs uppercase tracking-wider disabled:opacity-50" data-testid="apply-code-btn">
                        {validating ? "..." : "Piemērot"}
                      </button>
                    </div>
                  )}
                  {codeErr && <div className="mt-2 text-red-500 text-xs" data-testid="code-error">{codeErr}</div>}
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-black/10 space-y-3 text-sm">
                <div className="flex justify-between"><span>Starpsumma</span><span data-testid="subtotal">€{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><Truck size={12} weight="duotone" /> Piegāde</span>
                  <span>{shipping === 0 ? "Bezmaksas" : `€${shipping.toFixed(2)}`}</span>
                </div>
                {applied && (
                  <div className="flex justify-between text-green-600" data-testid="discount-row">
                    <span>Atlaide ({applied.code})</span>
                    <span>−€{discountAmt.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-black/10 flex justify-between font-display font-bold text-lg">
                <span>Kopā</span>
                <span data-testid="cart-total">€{finalTotal.toFixed(2)}</span>
              </div>

              {step === "cart" && (
                <button onClick={goToAddress} className="btn-primary w-full mt-6" data-testid="checkout-button">
                  Turpināt <ArrowRight size={16} weight="bold" />
                </button>
              )}
              <div className="mt-4 text-xs text-neutral-500 leading-relaxed">
                Pieņemam Apple Pay, Google Pay, kartes un PayPal. Drošs maksājums caur Stripe.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

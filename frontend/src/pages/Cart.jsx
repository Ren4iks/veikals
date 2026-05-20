import { Link, useNavigate } from "react-router-dom";
import { Trash, Plus, Minus, ArrowRight } from "@phosphor-icons/react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Cart() {
  const { cart, update, remove } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const checkout = async () => {
    if (!user || user === false) {
      navigate("/login");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Maksājumu nevarēja izveidot");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="cart-page">
      <div className="label-eyebrow">Grozs</div>
      <h1 className="font-display font-black text-5xl sm:text-6xl tracking-tighter mt-2">Tavs grozs</h1>

      {cart.items.length === 0 ? (
        <div className="mt-16 text-center py-16 border border-black/10">
          <div className="text-neutral-500">Grozs ir tukšs.</div>
          <Link to="/shop" className="btn-primary mt-6 inline-flex" data-testid="empty-cart-shop-btn">
            Sākt iepirkties
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((it) => (
              <div key={it.product.id} className="flex items-center gap-4 sm:gap-6 border border-black/10 p-4" data-testid={`cart-item-${it.product.id}`}>
                <Link to={`/product/${it.product.id}`} className="w-24 h-24 sm:w-28 sm:h-28 bg-neutral-100 flex-shrink-0">
                  <img src={it.product.image_url} alt={it.product.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="label-eyebrow">{it.product.category}</div>
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
            ))}
          </div>
          <aside className="lg:col-span-1">
            <div className="border border-black/10 p-6 sticky top-24">
              <div className="font-display font-bold text-xl">Kopsavilkums</div>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between"><span>Starpsumma</span><span>€{cart.total.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Piegāde</span><span>{cart.total >= 50 ? "Bezmaksas" : "€5.00"}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t border-black/10 flex justify-between font-display font-bold text-lg">
                <span>Kopā</span>
                <span data-testid="cart-total">€{(cart.total + (cart.total >= 50 ? 0 : (cart.total > 0 ? 5 : 0))).toFixed(2)}</span>
              </div>
              <button
                onClick={checkout}
                disabled={submitting}
                className="btn-primary w-full mt-6 disabled:opacity-50"
                data-testid="checkout-button"
              >
                {submitting ? "Apstrādā..." : "Maksāt"} <ArrowRight size={16} weight="bold" />
              </button>
              <div className="mt-4 text-xs text-neutral-500 leading-relaxed">
                Pieņemam Apple Pay, Google Pay, kartes un PayPal. Visi maksājumi tiek apstrādāti droši caur Stripe.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

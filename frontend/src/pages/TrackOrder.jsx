import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Package, Truck, CheckCircle, XCircle, MagnifyingGlass, ArrowRight } from "@phosphor-icons/react";
import api from "@/lib/api";

const STATUS_LABELS = {
  pending: "Gaida apmaksu",
  paid: "Apmaksāts",
  shipped: "Nosūtīts",
  delivered: "Piegādāts",
  cancelled: "Atcelts",
};

export default function TrackOrder() {
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get("order_id") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (e) => {
    e?.preventDefault?.();
    setErr("");
    setBusy(true);
    try {
      const { data } = await api.get(`/orders/track/${orderId.trim()}`, { params: { email: email.trim() } });
      setOrder(data);
    } catch (ex) {
      setOrder(null);
      setErr(ex.response?.data?.detail || "Pasūtījums nav atrasts");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="track-page">
      <div className="label-eyebrow">Pasūtījums</div>
      <h1 className="font-display font-black text-5xl tracking-tighter mt-2">Sekot pasūtījumam</h1>
      <p className="text-neutral-600 mt-3">Ievadi pasūtījuma ID un e-pastu, ar ko veicāt pirkumu.</p>

      <form onSubmit={lookup} className="mt-8 grid sm:grid-cols-[1fr_1fr_auto] gap-3">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Pasūtījuma ID (no apstiprinājuma)"
          className="shadcn-input"
          required
          data-testid="track-order-id"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tavs@e-pasts.lv"
          className="shadcn-input"
          required
          data-testid="track-email"
        />
        <button type="submit" disabled={busy} className="btn-primary" data-testid="track-submit">
          <MagnifyingGlass size={16} weight="bold" /> {busy ? "..." : "Meklēt"}
        </button>
      </form>

      {err && <div className="mt-6 text-red-500 text-sm" data-testid="track-error">{err}</div>}

      {order && (
        <div className="mt-12" data-testid="track-result">
          <div className="border border-black/10 p-6">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="label-eyebrow">Pasūtījums #{order.id.slice(0, 8)}</div>
                <div className="font-display font-bold text-2xl mt-1">{STATUS_LABELS[order.status] || order.status}</div>
                <div className="text-sm text-neutral-500 mt-1">{new Date(order.created_at).toLocaleString("lv")}</div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold text-2xl">€{order.total.toFixed(2)}</div>
                <div className={`text-xs uppercase tracking-wider mt-1 ${order.payment_status === "paid" ? "text-green-600" : "text-neutral-500"}`}>
                  {order.payment_status === "paid" ? "Apmaksāts" : order.payment_status}
                </div>
              </div>
            </div>

            {/* Timeline */}
            {order.status !== "cancelled" ? (
              <div className="mt-10 grid grid-cols-4 gap-2 relative">
                {order.timeline.map((step, i) => {
                  const icon = { pending: Package, paid: CheckCircle, shipped: Truck, delivered: CheckCircle }[step.key];
                  const Icon = icon || Package;
                  return (
                    <div key={step.key} className="text-center relative" data-testid={`timeline-${step.key}`}>
                      <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${step.reached ? "bg-black text-white" : "bg-neutral-100 text-neutral-400"}`}>
                        <Icon size={22} weight="duotone" />
                      </div>
                      <div className={`mt-2 text-xs uppercase tracking-wider font-medium ${step.current ? "text-black" : "text-neutral-500"}`}>
                        {STATUS_LABELS[step.key]}
                      </div>
                      {i < order.timeline.length - 1 && (
                        <div className={`absolute top-6 left-[60%] right-[-40%] h-px ${order.timeline[i+1].reached ? "bg-black" : "bg-neutral-200"}`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 p-4 bg-red-50 text-red-700 text-sm flex items-center gap-2">
                <XCircle size={20} weight="duotone" /> Šis pasūtījums ir atcelts.
              </div>
            )}

            {/* Items */}
            <div className="mt-10 pt-8 border-t border-black/10">
              <div className="label-eyebrow mb-3">Pasūtītās preces</div>
              <div className="space-y-3">
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <img src={it.image_url} alt="" className="w-16 h-16 object-cover bg-neutral-100" />
                    <div className="flex-1">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-sm text-neutral-500">×{it.quantity} · €{it.price.toFixed(2)}</div>
                    </div>
                    <div className="font-display font-bold">€{(it.price * it.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {order.discount_code && (
              <div className="mt-4 text-sm text-green-700">
                Atlaide: <strong>{order.discount_code}</strong> (−€{(order.discount_amount || 0).toFixed(2)})
              </div>
            )}
          </div>

          <Link to="/shop" className="btn-secondary mt-6 inline-flex">
            Turpināt iepirkties <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      )}
    </div>
  );
}

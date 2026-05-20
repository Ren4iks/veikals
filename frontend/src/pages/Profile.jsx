import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import api from "@/lib/api";

export default function Profile() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user && user !== false) {
      api.get("/orders").then((r) => setOrders(r.data)).catch(() => {});
    }
  }, [user]);

  if (user === null) return <div className="p-20 text-center">Ielādē...</div>;
  if (user === false) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="profile-page">
      <div className="label-eyebrow">Konts</div>
      <h1 className="font-display font-black text-5xl tracking-tighter mt-2">Sveiks, {user.name}</h1>
      <div className="mt-2 text-neutral-600 text-sm">{user.email}</div>

      <h2 className="font-display font-bold text-2xl mt-16 mb-6">Mani pasūtījumi</h2>
      {orders.length === 0 ? (
        <div className="text-neutral-500 border border-black/10 p-10 text-center">Vēl nav neviena pasūtījuma.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="border border-black/10 p-5" data-testid={`order-${o.id}`}>
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <div className="font-display font-bold">Pasūtījums #{o.id.slice(0, 8)}</div>
                  <div className="text-xs text-neutral-500 mt-1">{new Date(o.created_at).toLocaleString("lv")}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-xl">€{o.total.toFixed(2)}</div>
                  <div className={`text-xs uppercase tracking-wider mt-1 ${o.payment_status === "paid" ? "text-green-600" : "text-neutral-500"}`}>
                    {o.payment_status === "paid" ? "Apmaksāts" : o.payment_status}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <img src={it.image_url} alt="" className="w-12 h-12 object-cover bg-neutral-100" />
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-neutral-500">×{it.quantity} · €{it.price.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

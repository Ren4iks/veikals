import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Trash, PencilSimple, Plus, X, Package, Tag, ShoppingBag, Robot, Truck, Bell } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import AdminChat from "@/components/AdminChat";
import NotificationsTab from "@/components/NotificationsTab";

const EMPTY_P = {
  name: "", description: "", price: 0, category: "apgerbs",
  image_url: "", stock: 10, variant: "", featured: false,
  brand: "", supplier_name: "", supplier_email: "",
};
const EMPTY_D = {
  code: "", type: "percentage", value: 10, active: true,
  min_order: 0, usage_limit: 0, description: "",
};

const TABS = [
  { key: "products", label: "Produkti", icon: Package },
  { key: "discounts", label: "Atlaides", icon: Tag },
  { key: "orders", label: "Pasūtījumi", icon: ShoppingBag },
  { key: "notifications", label: "Paziņojumi", icon: Bell },
  { key: "ai", label: "AI Bots", icon: Robot },
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("products");

  if (user === null) return <div className="p-20 text-center">Ielādē...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="admin-page">
      <div className="label-eyebrow">Admin</div>
      <h1 className="font-display font-black text-5xl tracking-tighter mt-2">Admin Vadības Panelis</h1>

      <div className="mt-10 border-b border-black/10 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`admin-tab-${t.key}`}
            className={`flex items-center gap-2 px-5 py-3 text-sm uppercase tracking-wider font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? "border-black text-black" : "border-transparent text-neutral-500 hover:text-black"
            }`}
          >
            <t.icon size={16} weight="duotone" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-10">
        {tab === "products" && <ProductsTab />}
        {tab === "discounts" && <DiscountsTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "ai" && <AdminChat />}
      </div>
    </div>
  );
}

// ====== Products Tab ======
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_P);
  const [show, setShow] = useState(false);

  const load = () => api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(null); setForm(EMPTY_P); setShow(true); };
  const startEdit = (p) => { setEditing(p.id); setForm({ ...EMPTY_P, ...p, variant: p.variant || "", brand: p.brand || "", supplier_name: p.supplier_name || "", supplier_email: p.supplier_email || "" }); setShow(true); };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) };
    try {
      if (editing) await api.put(`/products/${editing}`, payload);
      else await api.post(`/products`, payload);
      toast.success("Saglabāts");
      setShow(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Saglabāšana neizdevās");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Dzēst produktu?")) return;
    try { await api.delete(`/products/${id}`); toast.success("Dzēsts"); load(); }
    catch { toast.error("Neizdevās dzēst"); }
  };

  return (
    <div>
      <div className="flex justify-between mb-6">
        <div className="font-display font-bold text-2xl">Produkti ({products.length})</div>
        <button onClick={startNew} className="btn-primary" data-testid="admin-new-product">
          <Plus size={16} weight="bold" /> Jauns produkts
        </button>
      </div>
      <div className="border border-black/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-neutral-50 border-b border-black/10 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-4">Attēls</th>
              <th className="text-left p-4">Nosaukums</th>
              <th className="text-left p-4">Zīmols</th>
              <th className="text-left p-4">Piegādātājs</th>
              <th className="text-left p-4">Cena</th>
              <th className="text-left p-4">Krājumā</th>
              <th className="text-right p-4">Darbības</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5" data-testid={`admin-row-${p.id}`}>
                <td className="p-4"><img src={p.image_url} alt="" className="w-12 h-12 object-cover bg-neutral-100" /></td>
                <td className="p-4 font-medium">{p.name}</td>
                <td className="p-4 text-neutral-700">{p.brand || "—"}</td>
                <td className="p-4 text-neutral-600 text-xs">
                  <div>{p.supplier_name || "—"}</div>
                  {p.supplier_email && <div className="text-neutral-400">{p.supplier_email}</div>}
                </td>
                <td className="p-4">€{p.price.toFixed(2)}</td>
                <td className="p-4">{p.stock}</td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(p)} className="p-2 hover:bg-neutral-100" data-testid={`admin-edit-${p.id}`}>
                    <PencilSimple size={16} weight="duotone" />
                  </button>
                  <button onClick={() => del(p.id)} className="p-2 hover:text-red-500" data-testid={`admin-delete-${p.id}`}>
                    <Trash size={16} weight="duotone" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal onClose={() => setShow(false)} title={editing ? "Rediģēt produktu" : "Jauns produkts"}>
          <form onSubmit={save} className="space-y-3">
            <input placeholder="Nosaukums" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="shadcn-input" data-testid="admin-input-name" />
            <textarea placeholder="Apraksts" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="shadcn-input" data-testid="admin-input-desc" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="Cena €" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="shadcn-input" data-testid="admin-input-price" />
              <input type="number" placeholder="Krājumā" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="shadcn-input" data-testid="admin-input-stock" />
            </div>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="shadcn-input" data-testid="admin-input-category">
              <option value="apgerbs">Apģērbs</option>
              <option value="elektronika">Elektronika</option>
              <option value="smarzas">Smaržas</option>
            </select>
            <input placeholder="Zīmols (piem. Apple, Nike)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="shadcn-input" data-testid="admin-input-brand" />
            <input placeholder="Variants (piem. Black, Orange)" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} className="shadcn-input" data-testid="admin-input-variant" />
            <input placeholder="Attēla URL" required value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="shadcn-input" data-testid="admin-input-image" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Piegādātājs (ražotājs)" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} className="shadcn-input" data-testid="admin-input-supplier-name" />
              <input type="email" placeholder="Piegādātāja e-pasts" value={form.supplier_email} onChange={(e) => setForm({ ...form, supplier_email: e.target.value })} className="shadcn-input" data-testid="admin-input-supplier-email" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} data-testid="admin-input-featured" />
              Izcelt sākumlapā
            </label>
            <button type="submit" className="btn-primary w-full" data-testid="admin-save-btn">Saglabāt</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ====== Discounts Tab ======
function DiscountsTab() {
  const [codes, setCodes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_D);
  const [show, setShow] = useState(false);

  const load = () => api.get("/discount-codes").then((r) => setCodes(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(null); setForm(EMPTY_D); setShow(true); };
  const startEdit = (c) => { setEditing(c.id); setForm({ ...c }); setShow(true); };

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      code: form.code.toUpperCase(),
      value: parseFloat(form.value),
      min_order: parseFloat(form.min_order || 0),
      usage_limit: parseInt(form.usage_limit || 0),
    };
    try {
      if (editing) await api.put(`/discount-codes/${editing}`, payload);
      else await api.post(`/discount-codes`, payload);
      toast.success("Saglabāts");
      setShow(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Saglabāšana neizdevās");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Dzēst kodu?")) return;
    try { await api.delete(`/discount-codes/${id}`); toast.success("Dzēsts"); load(); }
    catch { toast.error("Neizdevās"); }
  };

  return (
    <div>
      <div className="flex justify-between mb-6">
        <div className="font-display font-bold text-2xl">Atlaižu kodi ({codes.length})</div>
        <button onClick={startNew} className="btn-primary" data-testid="admin-new-discount">
          <Plus size={16} weight="bold" /> Jauns kods
        </button>
      </div>
      <div className="border border-black/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-neutral-50 border-b border-black/10 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-4">Kods</th>
              <th className="text-left p-4">Tips</th>
              <th className="text-left p-4">Vērtība</th>
              <th className="text-left p-4">Min. summa</th>
              <th className="text-left p-4">Izmantots / Limits</th>
              <th className="text-left p-4">Statuss</th>
              <th className="text-right p-4">Darbības</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-black/5" data-testid={`discount-row-${c.code}`}>
                <td className="p-4 font-display font-bold">{c.code}</td>
                <td className="p-4 text-neutral-600">{c.type === "percentage" ? "Procenti" : "Fiksēta"}</td>
                <td className="p-4">{c.type === "percentage" ? `${c.value}%` : `€${c.value.toFixed(2)}`}</td>
                <td className="p-4">€{(c.min_order || 0).toFixed(2)}</td>
                <td className="p-4">{c.used_count || 0} / {c.usage_limit === 0 ? "∞" : c.usage_limit}</td>
                <td className="p-4">
                  <span className={`text-xs uppercase tracking-wider font-medium px-2 py-1 ${c.active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {c.active ? "Aktīvs" : "Neaktīvs"}
                  </span>
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(c)} className="p-2 hover:bg-neutral-100" data-testid={`discount-edit-${c.code}`}>
                    <PencilSimple size={16} weight="duotone" />
                  </button>
                  <button onClick={() => del(c.id)} className="p-2 hover:text-red-500" data-testid={`discount-delete-${c.code}`}>
                    <Trash size={16} weight="duotone" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <Modal onClose={() => setShow(false)} title={editing ? "Rediģēt kodu" : "Jauns atlaides kods"}>
          <form onSubmit={save} className="space-y-3">
            <input placeholder="KODS (piem. SUMMER10)" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="shadcn-input" data-testid="discount-input-code" />
            <input placeholder="Apraksts" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="shadcn-input" data-testid="discount-input-desc" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="shadcn-input" data-testid="discount-input-type">
              <option value="percentage">Procenti (%)</option>
              <option value="fixed">Fiksēta summa (€)</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="Vērtība" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="shadcn-input" data-testid="discount-input-value" />
              <input type="number" step="0.01" placeholder="Min. pasūtījums €" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} className="shadcn-input" data-testid="discount-input-minorder" />
            </div>
            <input type="number" placeholder="Izmantošanas limits (0 = bezgalīgs)" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="shadcn-input" data-testid="discount-input-limit" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} data-testid="discount-input-active" /> Aktīvs
            </label>
            <button type="submit" className="btn-primary w-full" data-testid="discount-save-btn">Saglabāt</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ====== Orders Tab ======
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const load = () => api.get("/orders").then((r) => setOrders(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      toast.success(`Statuss: ${status}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Neizdevās");
    }
  };

  const statusColor = (s) => ({
    pending: "bg-neutral-100 text-neutral-600",
    paid: "bg-blue-100 text-blue-700",
    shipped: "bg-amber-100 text-amber-800",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  })[s] || "bg-neutral-100";

  return (
    <div>
      <div className="font-display font-bold text-2xl mb-6">Pasūtījumi ({orders.length})</div>
      {orders.length === 0 ? (
        <div className="border border-black/10 p-10 text-center text-neutral-500">Vēl nav pasūtījumu.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border border-black/10 p-5" data-testid={`order-row-${o.id}`}>
              <div className="flex justify-between flex-wrap gap-3">
                <div>
                  <div className="font-display font-bold">#{o.id.slice(0, 8)}</div>
                  <div className="text-xs text-neutral-500">{o.user_email} · {new Date(o.created_at).toLocaleString("lv")}</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-lg">€{o.total.toFixed(2)}</div>
                  <span className={`text-xs uppercase tracking-wider font-medium px-2 py-1 ${statusColor(o.status)}`}>{o.status}</span>
                  <span className={`text-xs uppercase tracking-wider ml-2 px-2 py-1 ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {o.payment_status}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-neutral-700">
                {o.items.map((it, i) => (
                  <span key={i}><strong>{it.name}</strong> ×{it.quantity}</span>
                ))}
              </div>
              {o.discount_code && <div className="mt-2 text-xs text-green-700">Atlaide: {o.discount_code} (−€{(o.discount_amount || 0).toFixed(2)})</div>}
              <div className="mt-4 flex gap-2 flex-wrap">
                {o.payment_status === "paid" && o.status !== "shipped" && (
                  <button onClick={() => setStatus(o.id, "shipped")} className="text-xs px-3 py-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center gap-1" data-testid={`order-ship-${o.id}`}>
                    <Truck size={12} weight="duotone" /> Atzīmēt kā nosūtītu
                  </button>
                )}
                {o.status === "shipped" && (
                  <button onClick={() => setStatus(o.id, "delivered")} className="text-xs px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200" data-testid={`order-deliver-${o.id}`}>
                    Piegādāts
                  </button>
                )}
                {o.status !== "cancelled" && o.status !== "delivered" && (
                  <button onClick={() => setStatus(o.id, "cancelled")} className="text-xs px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100" data-testid={`order-cancel-${o.id}`}>
                    Atcelt
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-black/10 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-black/10">
          <div className="font-display font-bold text-xl">{title}</div>
          <button onClick={onClose} className="hover:opacity-70" data-testid="modal-close"><X size={20} weight="bold" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

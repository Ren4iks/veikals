import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Trash, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

const EMPTY = {
  name: "", description: "", price: 0, category: "apgerbs",
  image_url: "", stock: 10, variant: "", featured: false,
};

export default function Admin() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [show, setShow] = useState(false);

  const load = () => api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  useEffect(() => { if (user?.role === "admin") load(); }, [user]);

  if (user === null) return <div className="p-20 text-center">Ielādē...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  const startNew = () => { setEditing(null); setForm(EMPTY); setShow(true); };
  const startEdit = (p) => { setEditing(p.id); setForm({ ...p, variant: p.variant || "" }); setShow(true); };

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
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="admin-page">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="label-eyebrow">Admin</div>
          <h1 className="font-display font-black text-5xl tracking-tighter mt-2">Produktu pārvaldība</h1>
        </div>
        <button onClick={startNew} className="btn-primary" data-testid="admin-new-product">
          <Plus size={16} weight="bold" /> Jauns produkts
        </button>
      </div>

      <div className="mt-10 border border-black/10">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-black/10 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-4">Attēls</th>
              <th className="text-left p-4">Nosaukums</th>
              <th className="text-left p-4">Kategorija</th>
              <th className="text-left p-4">Cena</th>
              <th className="text-left p-4">Krājumā</th>
              <th className="text-right p-4">Darbības</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5" data-testid={`admin-row-${p.id}`}>
                <td className="p-4"><img src={p.image_url} alt="" className="w-14 h-14 object-cover bg-neutral-100" /></td>
                <td className="p-4 font-medium">{p.name}</td>
                <td className="p-4 text-neutral-600">{p.category}</td>
                <td className="p-4">€{p.price.toFixed(2)}</td>
                <td className="p-4">{p.stock}</td>
                <td className="p-4 text-right">
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <div className="bg-white border border-black/10 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="admin-product-modal">
            <div className="flex justify-between items-center p-5 border-b border-black/10">
              <div className="font-display font-bold text-xl">{editing ? "Rediģēt produktu" : "Jauns produkts"}</div>
              <button onClick={() => setShow(false)} className="hover:opacity-70"><X size={20} weight="bold" /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
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
              <input placeholder="Variants (piem. Black, Orange)" value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} className="shadcn-input" data-testid="admin-input-variant" />
              <input placeholder="Attēla URL" required value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="shadcn-input" data-testid="admin-input-image" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} data-testid="admin-input-featured" />
                Izcelt sākumlapā
              </label>
              <button type="submit" className="btn-primary w-full" data-testid="admin-save-btn">Saglabāt</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

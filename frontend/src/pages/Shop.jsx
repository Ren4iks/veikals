import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FunnelSimple, X } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";
import { toast } from "sonner";

const CATS = [
  { key: "", label: "Visi" },
  { key: "elektronika", label: "Elektronika" },
  { key: "apgerbs", label: "Apģērbs" },
  { key: "smarzas", label: "Smaržas" },
];

const SORTS = [
  { value: "", label: "Noklusētais" },
  { value: "newest", label: "Jaunākie" },
  { value: "price_asc", label: "Cena: lētāk" },
  { value: "price_desc", label: "Cena: dārgāk" },
  { value: "name", label: "Pēc nosaukuma" },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";

  const [products, setProducts] = useState(null);
  const { user } = useAuth();
  const { add } = useCart();

  useEffect(() => {
    const params = new URLSearchParams();
    if (cat) params.set("category", cat);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    setProducts(null);
    api.get(`/products?${params.toString()}`).then((r) => setProducts(r.data)).catch(() => setProducts([]));
  }, [cat, search, sort, minPrice, maxPrice]);

  const update = (k, v) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v);
    else next.delete(k);
    setSearchParams(next);
  };

  const clearAll = () => setSearchParams({});
  const handleAdd = async (p) => {
    if (!user || user === false) {
      toast.error("Lūdzu, vispirms pieslēdzies");
      return;
    }
    try { await add(p.id, 1); toast.success(`${p.name} pievienots grozam`); }
    catch { toast.error("Neizdevās pievienot"); }
  };

  const activeCount = [cat, search, sort, minPrice, maxPrice].filter(Boolean).length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="shop-page">
      <div className="label-eyebrow">Veikals</div>
      <h1 className="font-display font-black text-5xl sm:text-6xl tracking-tighter mt-2">
        {search ? `“${search}”` : "Visi produkti"}
      </h1>

      <div className="mt-10 flex flex-wrap gap-3 items-center">
        {CATS.map((c) => (
          <button
            key={c.key}
            onClick={() => update("category", c.key)}
            data-testid={`filter-${c.key || "all"}`}
            className={`px-5 py-2.5 text-xs uppercase tracking-wider font-medium border ${
              cat === c.key
                ? "bg-black text-white border-black"
                : "bg-white text-black border-black/15 hover:border-black"
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="flex-1" />
        <select
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
          className="shadcn-input text-sm py-2.5 w-auto"
          data-testid="sort-select"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 items-center text-sm">
        <FunnelSimple size={16} weight="duotone" className="text-neutral-500" />
        <span className="text-neutral-600">Cena:</span>
        <input
          type="number" placeholder="No €" value={minPrice}
          onChange={(e) => update("min_price", e.target.value)}
          className="shadcn-input text-sm py-2 w-24"
          data-testid="price-min"
        />
        <input
          type="number" placeholder="Līdz €" value={maxPrice}
          onChange={(e) => update("max_price", e.target.value)}
          className="shadcn-input text-sm py-2 w-24"
          data-testid="price-max"
        />
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs uppercase tracking-wider text-red-500 hover:text-red-700 flex items-center gap-1" data-testid="clear-filters">
            <X size={12} weight="bold" /> Notīrīt visus
          </button>
        )}
      </div>

      <div className="mt-10 text-sm text-neutral-500" data-testid="results-count">
        {products === null ? "Ielādē..." : `${products.length} ${products.length === 1 ? "rezultāts" : "rezultāti"}`}
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" data-testid="shop-products-grid">
        {products === null ? (
          // Loading skeleton
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] bg-neutral-100" />
              <div className="mt-4 h-3 bg-neutral-100 w-1/3" />
              <div className="mt-2 h-4 bg-neutral-100 w-2/3" />
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="col-span-full text-center py-20 text-neutral-500">
            {search ? `Nekas neatbilst meklēšanai "${search}".` : "Šajā kategorijā produktu nav."}
          </div>
        ) : (
          products.map((p) => <ProductCard key={p.id} product={p} onAdd={handleAdd} />)
        )}
      </div>
    </div>
  );
}

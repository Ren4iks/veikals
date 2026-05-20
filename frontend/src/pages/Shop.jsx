import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = searchParams.get("category") || "";
  const [products, setProducts] = useState([]);
  const { user } = useAuth();
  const { add } = useCart();

  useEffect(() => {
    const q = cat ? `?category=${cat}` : "";
    api.get(`/products${q}`).then((r) => setProducts(r.data)).catch(() => {});
  }, [cat]);

  const handleAdd = async (p) => {
    if (!user || user === false) {
      toast.error("Lūdzu, vispirms pieslēdzieties");
      return;
    }
    try {
      await add(p.id, 1);
      toast.success(`${p.name} pievienots grozam`);
    } catch {
      toast.error("Neizdevās pievienot");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="shop-page">
      <div className="label-eyebrow">Veikals</div>
      <h1 className="font-display font-black text-5xl sm:text-6xl tracking-tighter mt-2">Visi produkti</h1>

      <div className="mt-10 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              if (c.key) setSearchParams({ category: c.key });
              else setSearchParams({});
            }}
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
      </div>

      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" data-testid="shop-products-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={handleAdd} />
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-center py-20 text-neutral-500">Šajā kategorijā produktu nav.</div>
        )}
      </div>
    </div>
  );
}

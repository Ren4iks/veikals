import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Trash } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Wishlist() {
  const { user } = useAuth();
  const { items, toggle } = useWishlist();
  const { add } = useCart();
  const navigate = useNavigate();

  if (user === null) return <div className="p-20 text-center">Ielādē...</div>;
  if (user === false) {
    return (
      <div className="max-w-md mx-auto p-16 text-center">
        <div className="label-eyebrow">Vēlmju saraksts</div>
        <h1 className="font-display font-bold text-3xl mt-2">Vispirms pieslēdzies</h1>
        <Link to="/login" className="btn-primary mt-6 inline-flex">Pieslēgties</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12 lg:py-16" data-testid="wishlist-page">
      <div className="label-eyebrow">Saglabātie</div>
      <h1 className="font-display font-black text-5xl tracking-tighter mt-2">Vēlmju saraksts</h1>
      <p className="text-neutral-600 mt-2">{items.length} {items.length === 1 ? "prece" : "preces"}</p>

      {items.length === 0 ? (
        <div className="mt-12 border border-black/10 p-16 text-center">
          <Heart size={48} weight="duotone" className="mx-auto text-neutral-300" />
          <div className="mt-4 text-neutral-500">Vēl nav nekā saglabāta.</div>
          <Link to="/shop" className="btn-primary mt-6 inline-flex">Apskatīt veikalu</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {items.map((p) => (
            <div key={p.id} className="product-card" data-testid={`wishlist-item-${p.id}`}>
              <Link to={`/product/${p.id}`} className="block aspect-[4/5] bg-neutral-100 overflow-hidden">
                <img src={p.image_url} alt={p.name} className="product-image w-full h-full object-cover" loading="lazy" />
              </Link>
              <div className="pt-4">
                <div className="label-eyebrow">{p.brand || p.category}</div>
                <h3 className="font-display font-bold text-base mt-1">{p.name}</h3>
                <div className="font-display font-bold mt-1">€{p.price.toFixed(2)}</div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={async () => { try { await add(p.id, 1); toast.success("Pievienots grozam"); } catch { toast.error("Neizdevās"); } }}
                    className="flex-1 text-xs uppercase tracking-wider py-2 bg-black text-white hover:bg-neutral-800"
                    data-testid={`wishlist-add-${p.id}`}
                  >
                    Grozam
                  </button>
                  <button
                    onClick={() => toggle(p.id)}
                    className="p-2 border border-black/15 hover:text-red-500"
                    data-testid={`wishlist-remove-${p.id}`}
                  >
                    <Trash size={16} weight="duotone" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";
import { Heart } from "@phosphor-icons/react";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function ProductCard({ product, onAdd }) {
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const inWish = has(product.id);

  const handleHeart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || user === false) {
      toast.error("Pieslēdzies, lai saglabātu");
      return;
    }
    try {
      const r = await toggle(product.id);
      toast.success(r.in_wishlist ? "Saglabāts vēlmju sarakstā" : "Noņemts no saraksta");
    } catch {
      toast.error("Neizdevās");
    }
  };

  return (
    <div className="product-card group" data-testid={`product-card-${product.id}`}>
      <div className="relative">
        <Link to={`/product/${product.id}`} className="block">
          <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
            <img
              src={product.image_url}
              alt={product.name}
              className="product-image w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </Link>
        <button
          onClick={handleHeart}
          className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur transition-colors ${inWish ? "text-red-500" : "text-neutral-700 hover:text-red-500"}`}
          data-testid={`wish-toggle-${product.id}`}
          aria-label="Wishlist"
        >
          <Heart size={18} weight={inWish ? "fill" : "duotone"} />
        </button>
        {product.stock !== undefined && product.stock <= 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1">Izpārdots</div>
        )}
        {product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
          <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1">Tikai {product.stock}</div>
        )}
      </div>
      <Link to={`/product/${product.id}`}>
        <div className="pt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="label-eyebrow">{product.brand || (product.category === "elektronika" ? "Elektronika" : product.category === "apgerbs" ? "Apģērbs" : "Smaržas")}</div>
            <h3 className="font-display font-bold text-base sm:text-lg mt-1 leading-tight truncate">{product.name}</h3>
            {product.variant && <div className="text-xs text-neutral-500 mt-1">{product.variant}</div>}
          </div>
          <div className="font-display font-bold text-lg whitespace-nowrap">€{product.price.toFixed(2)}</div>
        </div>
      </Link>
      {onAdd && (
        <button
          onClick={() => onAdd(product)}
          disabled={product.stock !== undefined && product.stock <= 0}
          className="mt-3 w-full py-2.5 bg-black text-white text-xs font-medium uppercase tracking-wider hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid={`add-to-cart-${product.id}`}
        >
          {product.stock !== undefined && product.stock <= 0 ? "Izpārdots" : "Pievienot grozam"}
        </button>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";

export default function ProductCard({ product, onAdd }) {
  return (
    <div className="product-card group" data-testid={`product-card-${product.id}`}>
      <Link to={`/product/${product.id}`} className="block">
        <div className="aspect-[4/5] bg-neutral-100 overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="product-image w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="pt-4 flex items-start justify-between gap-4">
          <div>
            <div className="label-eyebrow">{product.category === "elektronika" ? "Elektronika" : product.category === "apgerbs" ? "Apģērbs" : "Smaržas"}</div>
            <h3 className="font-display font-bold text-base sm:text-lg mt-1 leading-tight">{product.name}</h3>
            {product.variant && <div className="text-xs text-neutral-500 mt-1">{product.variant}</div>}
          </div>
          <div className="font-display font-bold text-lg whitespace-nowrap">€{product.price.toFixed(2)}</div>
        </div>
      </Link>
      {onAdd && (
        <button
          onClick={() => onAdd(product)}
          className="mt-3 w-full py-2.5 bg-black text-white text-xs font-medium uppercase tracking-wider hover:bg-neutral-800 transition-colors"
          data-testid={`add-to-cart-${product.id}`}
        >
          Pievienot grozam
        </button>
      )}
    </div>
  );
}

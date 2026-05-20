import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const { user } = useAuth();
  const { add } = useCart();

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data)).catch(() => setProduct(false));
  }, [id]);

  const handleAdd = async () => {
    if (!user || user === false) {
      toast.error("Lūdzu, vispirms pieslēdzieties");
      navigate("/login");
      return;
    }
    try {
      await add(product.id, qty);
      toast.success(`${product.name} (${qty} gab.) pievienots grozam`);
    } catch {
      toast.error("Neizdevās pievienot");
    }
  };

  if (product === null) return <div className="p-20 text-center">Ielādē...</div>;
  if (product === false) return <div className="p-20 text-center">Produkts nav atrasts.</div>;

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 lg:py-16" data-testid="product-detail-page">
      <Link to="/shop" className="inline-flex items-center gap-2 text-sm uppercase tracking-wider mb-8 hover:opacity-70" data-testid="back-to-shop">
        <ArrowLeft size={16} weight="bold" /> Atpakaļ uz veikalu
      </Link>
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
        <div className="bg-neutral-100 aspect-square overflow-hidden">
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col justify-center">
          <div className="label-eyebrow" data-testid="product-category">
            {product.category === "elektronika" ? "Elektronika" : product.category === "apgerbs" ? "Apģērbs" : "Smaržas"}
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tighter mt-3" data-testid="product-name">
            {product.name}
          </h1>
          {product.variant && <div className="mt-3 text-sm text-neutral-500">Variants: <span className="font-medium text-black">{product.variant}</span></div>}
          <div className="font-display font-bold text-3xl mt-6" data-testid="product-price">€{product.price.toFixed(2)}</div>
          <p className="mt-6 text-neutral-700 leading-relaxed" data-testid="product-description">{product.description}</p>

          <div className="mt-8 text-sm text-neutral-600">Krājumā: <strong className="text-black">{product.stock}</strong> gab.</div>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border border-black/15">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 hover:bg-black hover:text-white" data-testid="qty-minus">
                <Minus size={14} weight="bold" />
              </button>
              <div className="w-12 text-center font-medium" data-testid="qty-value">{qty}</div>
              <button onClick={() => setQty(qty + 1)} className="p-3 hover:bg-black hover:text-white" data-testid="qty-plus">
                <Plus size={14} weight="bold" />
              </button>
            </div>
            <button onClick={handleAdd} className="btn-primary flex-1" data-testid="add-to-cart-detail">Pievienot grozam</button>
          </div>
        </div>
      </div>
    </div>
  );
}

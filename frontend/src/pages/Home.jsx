import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, ShieldCheck, ChatCircle, CreditCard } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";
import { toast } from "sonner";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/a74d4ba8-ecab-48b2-9ede-e8e8a4e9204f/images/2617313151f6261e298f6200438ab7563a2f5a8d57771124c1e7f47e2a36efe3.png";
const IPHONE_ORANGE = "https://static.prod-images.emergentagent.com/jobs/a74d4ba8-ecab-48b2-9ede-e8e8a4e9204f/images/cfab1305e39fbd5f94522fe452ea5359b6bf07da8a93b018636a484544e4602e.png";
const IPHONE_BLUE = "https://static.prod-images.emergentagent.com/jobs/a74d4ba8-ecab-48b2-9ede-e8e8a4e9204f/images/7fb36e33cec6a2ffc74fba30aaf36d46519e620c754366a6c1f6caec94627b86.png";

export default function Home() {
  const [products, setProducts] = useState([]);
  const { user } = useAuth();
  const { add } = useCart();

  useEffect(() => {
    api.get("/products?featured=true").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

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
    <div data-testid="home-page">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white" />
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 pt-16 pb-24 lg:pt-28 lg:pb-36">
          <div className="grid lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <div className="label-eyebrow mb-6" data-testid="hero-eyebrow">2025 Kolekcija · Jaunums</div>
              <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.92] tracking-tighter" data-testid="hero-title">
                Apģērbs.<br/>
                Tehnoloģijas.<br/>
                <span className="italic font-light">Smaržas.</span>
              </h1>
              <p className="mt-8 text-base sm:text-lg text-neutral-700 max-w-xl leading-relaxed">
                Rūpīgi atlasīta kolekcija — no minimālistiska apģērba līdz jaunajam <strong>iPhone 17 Pro Max</strong> un luksusa smaržām. Bezmaksas piegāde Latvijā no €50.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/shop" className="btn-primary" data-testid="hero-cta-shop">
                  Sākt iepirkties <ArrowRight size={16} weight="bold" />
                </Link>
                <Link to="/shop?category=elektronika" className="btn-secondary" data-testid="hero-cta-iphone">
                  Skatīt iPhone 17 Pro Max
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/5] bg-neutral-100 overflow-hidden">
                <img src={IPHONE_ORANGE} alt="iPhone 17 Pro Max Orange" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent text-white">
                  <div className="label-eyebrow text-white/80">Featured</div>
                  <div className="font-display font-bold text-xl mt-1">iPhone 17 Pro Max 1TB</div>
                  <div className="text-sm text-white/90">€950 · Oranžs & Zils</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="bg-black text-white overflow-hidden py-4">
        <div className="marquee text-sm uppercase tracking-[0.3em] font-medium">
          {Array(2).fill(0).map((_, i) => (
            <span key={i}>
              · Apple Pay · Google Pay · PayPal · Karte · Bankas pārskaitījums · Bezmaksas piegāde no €50 · GPT-5.2 AI palīgs · 14 dienu atgriešana
            </span>
          ))}
        </div>
      </div>

      {/* CATEGORIES BENTO */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="label-eyebrow">Kategorijas</div>
            <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mt-2">Pārlūko veikalu</h2>
          </div>
          <Link to="/shop" className="text-sm uppercase tracking-[0.18em] font-medium hover:opacity-70 hidden sm:flex items-center gap-2">
            Visi produkti <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/shop?category=elektronika" className="group relative aspect-square overflow-hidden bg-neutral-100" data-testid="category-elektronika">
            <img src={IPHONE_BLUE} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <div className="label-eyebrow text-white/80">01</div>
              <div className="font-display font-black text-3xl">Elektronika</div>
            </div>
          </Link>
          <Link to="/shop?category=apgerbs" className="group relative aspect-square overflow-hidden bg-neutral-100" data-testid="category-apgerbs">
            <img src="https://images.unsplash.com/photo-1590759483822-b2fee5aa6bd3?crop=entropy&cs=srgb&fm=jpg&q=85" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <div className="label-eyebrow text-white/80">02</div>
              <div className="font-display font-black text-3xl">Apģērbs</div>
            </div>
          </Link>
          <Link to="/shop?category=smarzas" className="group relative aspect-square overflow-hidden bg-neutral-100" data-testid="category-smarzas">
            <img src="https://images.unsplash.com/photo-1770301410072-f6ef6dad65b2?crop=entropy&cs=srgb&fm=jpg&q=85" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <div className="label-eyebrow text-white/80">03</div>
              <div className="font-display font-black text-3xl">Smaržas</div>
            </div>
          </Link>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-10 pb-20 lg:pb-28">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="label-eyebrow">Izvēlēti</div>
            <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mt-2">Populārākie produkti</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" data-testid="featured-products-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#F5F5F5] py-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { icon: Truck, title: "Bezmaksas piegāde", text: "Pasūtījumiem no €50" },
            { icon: ShieldCheck, title: "Drošs maksājums", text: "Apple Pay, Google Pay, PayPal" },
            { icon: CreditCard, title: "Visi maksājumi", text: "Karte un bankas pārskaitījums" },
            { icon: ChatCircle, title: "AI palīgs 24/7", text: "GPT-5.2 atbild uzreiz" },
          ].map((f, i) => (
            <div key={i} data-testid={`feature-${i}`}>
              <f.icon size={32} weight="duotone" />
              <div className="font-display font-bold text-lg mt-4">{f.title}</div>
              <div className="text-sm text-neutral-600 mt-1">{f.text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

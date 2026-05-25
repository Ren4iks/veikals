import { Link } from "react-router-dom";
import { ArrowLeft, House } from "@phosphor-icons/react";

export default function NotFound() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-24 lg:py-32 text-center" data-testid="not-found-page">
      <div className="font-display font-black text-[8rem] sm:text-[10rem] leading-none tracking-tighter text-black/10">404</div>
      <div className="label-eyebrow">Lapa nav atrasta</div>
      <h1 className="font-display font-bold text-4xl mt-3">Šeit nekā nav</h1>
      <p className="text-neutral-600 mt-4">Lapa, ko meklē, vai nu pārcēlās, vai nekad nav eksistējusi.</p>
      <div className="mt-10 flex gap-3 justify-center">
        <Link to="/" className="btn-primary"><House size={16} weight="duotone" /> Uz sākumu</Link>
        <button onClick={() => window.history.back()} className="btn-secondary"><ArrowLeft size={16} weight="bold" /> Atpakaļ</button>
      </div>
    </div>
  );
}

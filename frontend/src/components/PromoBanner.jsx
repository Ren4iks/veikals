import { useEffect, useState } from "react";
import { CopySimple, Tag, X } from "@phosphor-icons/react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function PromoBanner() {
  const [codes, setCodes] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.get("/discount-codes/public").then((r) => setCodes(r.data)).catch(() => {});
    setDismissed(sessionStorage.getItem("promo-dismissed") === "1");
  }, []);

  if (dismissed || codes.length === 0) return null;

  const copy = (c) => {
    navigator.clipboard.writeText(c).catch(() => {});
    toast.success(`Kods ${c} nokopēts!`);
  };

  return (
    <div className="bg-[#FF2B2B] text-white relative" data-testid="promo-banner">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-3 flex items-center gap-4 overflow-x-auto">
        <Tag size={18} weight="fill" className="flex-shrink-0" />
        <div className="flex items-center gap-6 flex-1 min-w-0">
          {codes.slice(0, 3).map((c) => (
            <button
              key={c.code}
              onClick={() => copy(c.code)}
              data-testid={`promo-code-${c.code}`}
              className="flex items-center gap-2 text-sm flex-shrink-0 hover:underline group"
            >
              <span className="font-bold tracking-wider uppercase">{c.code}</span>
              <span className="opacity-90">— {c.description || (c.type === "percentage" ? `-${c.value}%` : `-€${c.value}`)}</span>
              <CopySimple size={14} weight="bold" className="opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
        <button
          onClick={() => { setDismissed(true); sessionStorage.setItem("promo-dismissed", "1"); }}
          className="opacity-70 hover:opacity-100 flex-shrink-0"
          data-testid="promo-dismiss"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}

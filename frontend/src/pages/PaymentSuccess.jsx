import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Spinner } from "@phosphor-icons/react";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("polling"); // polling | success | failed | timeout
  const [details, setDetails] = useState(null);
  const { refresh } = useCart();

  useEffect(() => {
    if (!sessionId) {
      setStatus("failed");
      return;
    }
    let attempts = 0;
    const max = 10;
    const tick = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        setDetails(data);
        if (data.payment_status === "paid") {
          setStatus("success");
          refresh();
          return;
        }
        if (data.status === "expired") {
          setStatus("failed");
          return;
        }
      } catch { /* ignore, retry */ }
      attempts++;
      if (attempts >= max) {
        setStatus("timeout");
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="max-w-[700px] mx-auto px-6 py-24 text-center" data-testid="payment-success-page">
      {status === "polling" && (
        <>
          <Spinner size={56} className="mx-auto animate-spin" weight="duotone" />
          <h1 className="font-display font-bold text-3xl mt-6">Pārbaudām maksājumu...</h1>
          <p className="text-neutral-600 mt-3">Tas var ilgt dažas sekundes.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle size={72} weight="fill" className="mx-auto text-green-600" />
          <h1 className="font-display font-bold text-4xl mt-6" data-testid="success-message">Paldies par pasūtījumu!</h1>
          <p className="text-neutral-700 mt-3">
            Maksājums saņemts. Summa: <strong>€{((details?.amount_total || 0) / 100).toFixed(2)}</strong>
          </p>
          <p className="text-neutral-600 mt-2 text-sm">Apstiprinājums tiks nosūtīts uz tavu e-pastu.</p>
          <div className="flex gap-3 justify-center mt-10">
            <Link to="/track" className="btn-secondary">Sekot pasūtījumam</Link>
            <Link to="/profile" className="btn-secondary">Mani pasūtījumi</Link>
            <Link to="/shop" className="btn-primary">Turpināt iepirkties</Link>
          </div>
        </>
      )}
      {(status === "failed" || status === "timeout") && (
        <>
          <XCircle size={72} weight="fill" className="mx-auto text-red-500" />
          <h1 className="font-display font-bold text-3xl mt-6">Maksājums nav apstiprināts</h1>
          <p className="text-neutral-600 mt-3">
            {status === "timeout" ? "Pārbaude aizņēma pārāk ilgu laiku. Pārbaudi e-pastu vai mēģini vēlreiz." : "Maksājums nav veiksmīgs."}
          </p>
          <Link to="/cart" className="btn-primary mt-8 inline-flex">Atpakaļ uz grozu</Link>
        </>
      )}
    </div>
  );
}

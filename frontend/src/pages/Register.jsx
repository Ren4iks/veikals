import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const r = await register(email, password, name);
    setBusy(false);
    if (r.ok) {
      toast.success("Konts izveidots!");
      navigate("/");
    } else {
      setErr(r.error);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16 lg:py-24" data-testid="register-page">
      <div className="label-eyebrow">Konts</div>
      <h1 className="font-display font-black text-4xl tracking-tighter mt-2">Reģistrēties</h1>
      <form onSubmit={submit} className="mt-10 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider font-medium">Vārds</label>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="shadcn-input mt-2" placeholder="Jānis Bērziņš" data-testid="register-name"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider font-medium">E-pasts</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="shadcn-input mt-2" placeholder="tu@piemers.lv" data-testid="register-email"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider font-medium">Parole</label>
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="shadcn-input mt-2" placeholder="Vismaz 6 simboli" data-testid="register-password"
          />
        </div>
        {err && <div className="text-red-500 text-sm" data-testid="register-error">{err}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50" data-testid="register-submit">
          {busy ? "..." : "Izveidot kontu"}
        </button>
      </form>
      <div className="mt-6 text-sm text-neutral-600">
        Jau ir konts? <Link to="/login" className="underline font-medium text-black" data-testid="goto-login">Pieslēgties</Link>
      </div>
    </div>
  );
}

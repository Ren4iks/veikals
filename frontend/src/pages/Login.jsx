import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const r = await login(email, password);
    setBusy(false);
    if (r.ok) {
      toast.success("Veiksmīgi pieslēdzies!");
      const dest = loc.state?.from || "/";
      navigate(dest);
    } else {
      setErr(r.error);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16 lg:py-24" data-testid="login-page">
      <div className="label-eyebrow">Konts</div>
      <h1 className="font-display font-black text-4xl tracking-tighter mt-2">Pieslēgties</h1>
      <form onSubmit={submit} className="mt-10 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider font-medium">E-pasts</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="shadcn-input mt-2" placeholder="tu@piemers.lv" data-testid="login-email"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider font-medium">Parole</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="shadcn-input mt-2" placeholder="••••••••" data-testid="login-password"
          />
        </div>
        {err && <div className="text-red-500 text-sm" data-testid="login-error">{err}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50" data-testid="login-submit">
          {busy ? "..." : "Pieslēgties"}
        </button>
      </form>
      <div className="mt-6 text-sm text-neutral-600">
        Nav konta? <Link to="/register" className="underline font-medium text-black" data-testid="goto-register">Reģistrēties</Link>
      </div>
    </div>
  );
}

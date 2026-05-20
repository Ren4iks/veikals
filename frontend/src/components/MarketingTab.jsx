import { useEffect, useState } from "react";
import { TelegramLogo, FacebookLogo, InstagramLogo, Plus, X, PaperPlaneTilt, Trash, CheckCircle, XCircle, Image as ImageIcon } from "@phosphor-icons/react";
import api from "@/lib/api";
import { toast } from "sonner";

const ALL_CHANNELS = [
  { key: "telegram", label: "Telegram", icon: TelegramLogo, color: "text-sky-500" },
  { key: "facebook", label: "Facebook", icon: FacebookLogo, color: "text-blue-600" },
  { key: "instagram", label: "Instagram", icon: InstagramLogo, color: "text-pink-500" },
];

export default function MarketingTab() {
  const [channels, setChannels] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", caption: "", image_url: "", channels: ["telegram"] });
  const [busy, setBusy] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const load = async () => {
    const [c, list] = await Promise.all([
      api.get("/marketing/channels").then((r) => r.data),
      api.get("/marketing/campaigns").then((r) => r.data),
    ]);
    setChannels(c);
    setCampaigns(list);
  };
  useEffect(() => { load(); }, []);

  const toggleChannel = (k) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(k) ? f.channels.filter((x) => x !== k) : [...f.channels, k],
    }));
  };

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/marketing/campaigns", form);
      toast.success("Kampaņa izveidota");
      setShow(false);
      setForm({ title: "", caption: "", image_url: "", channels: ["telegram"] });
      load();
    } catch (ex) {
      toast.error(ex.response?.data?.detail || "Neizdevās");
    } finally {
      setBusy(false);
    }
  };

  const send = async (id) => {
    setSendingId(id);
    try {
      const { data } = await api.post(`/marketing/campaigns/${id}/send`);
      const sent = Object.entries(data.results).filter(([_, r]) => r.sent).map(([k]) => k);
      const failed = Object.entries(data.results).filter(([_, r]) => !r.sent);
      if (sent.length) toast.success(`Nosūtīts: ${sent.join(", ")}`);
      if (failed.length) {
        failed.forEach(([k, r]) => toast.error(`${k}: ${r.reason}`));
      }
      load();
    } catch (ex) {
      toast.error(ex.response?.data?.detail || "Neizdevās");
    } finally {
      setSendingId(null);
    }
  };

  const del = async (id) => {
    if (!window.confirm("Dzēst kampaņu?")) return;
    try { await api.delete(`/marketing/campaigns/${id}`); toast.success("Dzēsts"); load(); }
    catch { toast.error("Neizdevās"); }
  };

  if (!channels) return <div className="text-neutral-500">Ielādē...</div>;

  return (
    <div data-testid="marketing-tab">
      <div className="flex justify-between mb-6 items-end flex-wrap gap-3">
        <div>
          <div className="font-display font-bold text-2xl">Mārketinga kampaņas ({campaigns.length})</div>
          <div className="text-sm text-neutral-500 mt-1">Izveido un publicē reklāmas postus Telegram, Facebook un Instagram</div>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary" data-testid="mk-new-campaign">
          <Plus size={16} weight="bold" /> Jauna kampaņa
        </button>
      </div>

      {/* Channel status */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {ALL_CHANNELS.map((ch) => (
          <div key={ch.key} className="border border-black/10 p-4 flex items-center gap-3" data-testid={`mk-channel-${ch.key}`}>
            <ch.icon size={28} weight="duotone" className={ch.color} />
            <div className="flex-1">
              <div className="font-display font-bold">{ch.label}</div>
              <div className="text-xs flex items-center gap-1 mt-1">
                {channels[ch.key]?.configured ? (
                  <><CheckCircle size={12} weight="fill" className="text-green-600" /> Konfigurēts</>
                ) : (
                  <><XCircle size={12} weight="fill" className="text-neutral-400" /> Nav konfigurēts</>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns list */}
      {campaigns.length === 0 ? (
        <div className="border border-black/10 p-10 text-center text-neutral-500">
          Vēl nav neviena kampaņas. Sāc, izveidojot pirmo!
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="border border-black/10 p-5" data-testid={`campaign-${c.id}`}>
              <div className="flex flex-wrap gap-4 justify-between">
                <div className="flex gap-4 flex-1 min-w-0">
                  {c.image_url && <img src={c.image_url} alt="" className="w-20 h-20 object-cover bg-neutral-100 flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-display font-bold text-lg">{c.title}</div>
                    <div className="text-sm text-neutral-700 line-clamp-2 mt-1">{c.caption}</div>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {c.channels.map((ch) => {
                        const meta = ALL_CHANNELS.find((x) => x.key === ch);
                        const result = c.results?.[ch];
                        const sent = result?.sent;
                        return (
                          <span key={ch} className={`inline-flex items-center gap-1 text-xs px-2 py-1 ${sent ? "bg-green-100 text-green-700" : result ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-600"}`}>
                            <meta.icon size={11} weight="duotone" /> {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col gap-2 flex-shrink-0">
                  <div className="text-xs uppercase tracking-wider text-neutral-500">
                    {c.status === "sent" ? `Nosūtīts ${new Date(c.sent_at).toLocaleString("lv")}` : "Melnraksts"}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => send(c.id)} disabled={sendingId === c.id} className="text-xs px-3 py-1.5 bg-black text-white hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50" data-testid={`campaign-send-${c.id}`}>
                      <PaperPlaneTilt size={12} weight="duotone" /> {sendingId === c.id ? "Sūta..." : (c.status === "sent" ? "Sūtīt vēlreiz" : "Publicēt")}
                    </button>
                    <button onClick={() => del(c.id)} className="text-xs px-2 py-1.5 hover:text-red-500" data-testid={`campaign-delete-${c.id}`}>
                      <Trash size={14} weight="duotone" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <div className="bg-white border border-black/10 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="campaign-modal">
            <div className="flex justify-between items-center p-5 border-b border-black/10">
              <div className="font-display font-bold text-xl">Jauna kampaņa</div>
              <button onClick={() => setShow(false)}><X size={20} weight="bold" /></button>
            </div>
            <form onSubmit={create} className="p-5 space-y-4">
              <input placeholder="Iekšējais nosaukums" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="shadcn-input" data-testid="mk-title" />
              <textarea placeholder="Reklāmas teksts (var izmantot HTML <b>treknrakstam</b>)" required rows={5} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="shadcn-input" data-testid="mk-caption" />
              <div>
                <label className="text-xs uppercase tracking-wider font-medium flex items-center gap-1"><ImageIcon size={12} weight="duotone" /> Attēla URL (obligāts Instagram)</label>
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="shadcn-input mt-2" data-testid="mk-image" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-medium mb-2">Kanāli</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_CHANNELS.map((ch) => {
                    const selected = form.channels.includes(ch.key);
                    return (
                      <button
                        key={ch.key}
                        type="button"
                        onClick={() => toggleChannel(ch.key)}
                        data-testid={`mk-channel-toggle-${ch.key}`}
                        className={`px-3 py-2 text-sm flex items-center gap-2 border ${selected ? "bg-black text-white border-black" : "bg-white text-black border-black/15"}`}
                      >
                        <ch.icon size={14} weight="duotone" /> {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={busy || form.channels.length === 0} className="btn-primary w-full disabled:opacity-50" data-testid="mk-save">
                {busy ? "..." : "Saglabāt kā melnrakstu"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

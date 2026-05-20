import { useEffect, useState } from "react";
import { CheckCircle, XCircle, TelegramLogo, WhatsappLogo, PaperPlaneTilt, FloppyDisk, Eye, EyeSlash } from "@phosphor-icons/react";
import api from "@/lib/api";
import { toast } from "sonner";

const StatusBadge = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium px-2 py-1 ${ok ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
    {ok ? <CheckCircle size={12} weight="fill" /> : <XCircle size={12} weight="fill" />}
    {label}
  </span>
);

export default function NotificationsTab() {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    telegram_bot_token: "",
    telegram_chat_id: "",
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_whatsapp_from: "",
    whatsapp_to_default: "",
    enabled_telegram: true,
    enabled_whatsapp: true,
  });
  const [show, setShow] = useState({ tg: false, sid: false, auth: false });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(null);
  const [log, setLog] = useState([]);
  const [testMessage, setTestMessage] = useState("🧪 Tests no Veikals administrēšanas paneļa. Sistēma darbojas.");

  const load = async () => {
    const [s, st, lg] = await Promise.all([
      api.get("/notifications/status").then((r) => r.data),
      api.get("/notifications/settings").then((r) => r.data),
      api.get("/notifications/log").then((r) => r.data).catch(() => []),
    ]);
    setStatus(s);
    setSettings(st);
    setForm((f) => ({
      ...f,
      telegram_chat_id: st.telegram_chat_id || "",
      twilio_whatsapp_from: st.twilio_whatsapp_from || "",
      whatsapp_to_default: st.whatsapp_to_default || "",
      enabled_telegram: !!st.enabled_telegram,
      enabled_whatsapp: !!st.enabled_whatsapp,
    }));
    setLog(lg);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      // Only send non-empty secrets to avoid wiping existing values
      const payload = { ...form };
      ["telegram_bot_token", "twilio_account_sid", "twilio_auth_token"].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      await api.put("/notifications/settings", payload);
      toast.success("Iestatījumi saglabāti");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Neizdevās saglabāt");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async (channel) => {
    setTesting(channel);
    try {
      const { data } = await api.post("/notifications/test", { channel, message: testMessage });
      const r = data[channel] || Object.values(data)[0];
      if (r?.sent) toast.success(`${channel === "telegram" ? "Telegram" : "WhatsApp"}: nosūtīts!`);
      else toast.error(`${channel === "telegram" ? "Telegram" : "WhatsApp"}: ${r?.reason || "neizdevās"}`);
    } finally {
      setTesting(null);
    }
  };

  if (!status || !settings) return <div className="text-neutral-500">Ielādē...</div>;

  return (
    <div data-testid="notifications-tab">
      <div className="font-display font-bold text-2xl mb-6">Paziņojumi (Telegram + WhatsApp)</div>

      {/* Status overview */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="border border-black/10 p-5">
          <div className="flex items-center gap-3">
            <TelegramLogo size={28} weight="duotone" />
            <div className="font-display font-bold text-lg">Telegram</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge ok={status.telegram.token_set} label="Tokens" />
            <StatusBadge ok={status.telegram.chat_id_set} label="Chat ID" />
            <StatusBadge ok={status.telegram.enabled} label={status.telegram.enabled ? "Ieslēgts" : "Izslēgts"} />
          </div>
        </div>
        <div className="border border-black/10 p-5">
          <div className="flex items-center gap-3">
            <WhatsappLogo size={28} weight="duotone" />
            <div className="font-display font-bold text-lg">WhatsApp (Twilio)</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge ok={status.whatsapp.sid_set} label="Account SID" />
            <StatusBadge ok={status.whatsapp.token_set} label="Auth Token" />
            <StatusBadge ok={!!status.whatsapp.to_default} label="Saņēmējs" />
            <StatusBadge ok={status.whatsapp.enabled} label={status.whatsapp.enabled ? "Ieslēgts" : "Izslēgts"} />
          </div>
          {status.whatsapp.to_default && (
            <div className="mt-3 text-xs text-neutral-500">Saņēmējs: <strong className="text-black">{status.whatsapp.to_default}</strong></div>
          )}
        </div>
      </div>

      {/* Settings form */}
      <div className="border border-black/10 p-6 mb-8">
        <div className="font-display font-bold text-lg mb-5">Iestatījumi</div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Telegram */}
          <div className="space-y-3">
            <div className="label-eyebrow">Telegram</div>
            <div>
              <label className="text-xs uppercase tracking-wider font-medium">Bot Token {settings.telegram_bot_token_masked && <span className="ml-2 text-neutral-500 normal-case">saglabāts: {settings.telegram_bot_token_masked}</span>}</label>
              <div className="mt-2 flex">
                <input
                  type={show.tg ? "text" : "password"}
                  value={form.telegram_bot_token}
                  onChange={(e) => setForm({ ...form, telegram_bot_token: e.target.value })}
                  placeholder="123456:ABC-DEF..."
                  className="shadcn-input flex-1"
                  data-testid="notif-tg-token"
                />
                <button type="button" onClick={() => setShow({ ...show, tg: !show.tg })} className="px-3 border border-l-0 border-black/15 hover:bg-neutral-50">
                  {show.tg ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider font-medium">Chat ID</label>
              <input
                value={form.telegram_chat_id}
                onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
                placeholder="-1001234567890 vai 123456789"
                className="shadcn-input mt-2"
                data-testid="notif-tg-chat"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.enabled_telegram} onChange={(e) => setForm({ ...form, enabled_telegram: e.target.checked })} data-testid="notif-tg-enabled" />
              Ieslēgts Telegram sūtīšanai
            </label>
            <p className="text-xs text-neutral-500 leading-relaxed">
              💡 Token: izveidojiet jaunu botu pie @BotFather. Chat ID: nosūtiet ziņu savam botam, tad atveriet:<br/>
              <code className="text-xs">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
            </p>
          </div>

          {/* WhatsApp */}
          <div className="space-y-3">
            <div className="label-eyebrow">WhatsApp (Twilio)</div>
            <div>
              <label className="text-xs uppercase tracking-wider font-medium">Account SID {settings.twilio_account_sid_masked && <span className="ml-2 text-neutral-500 normal-case">saglabāts: {settings.twilio_account_sid_masked}</span>}</label>
              <div className="mt-2 flex">
                <input
                  type={show.sid ? "text" : "password"}
                  value={form.twilio_account_sid}
                  onChange={(e) => setForm({ ...form, twilio_account_sid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="shadcn-input flex-1"
                  data-testid="notif-tw-sid"
                />
                <button type="button" onClick={() => setShow({ ...show, sid: !show.sid })} className="px-3 border border-l-0 border-black/15 hover:bg-neutral-50">
                  {show.sid ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider font-medium">Auth Token {settings.twilio_auth_token_masked && <span className="ml-2 text-neutral-500 normal-case">saglabāts: {settings.twilio_auth_token_masked}</span>}</label>
              <div className="mt-2 flex">
                <input
                  type={show.auth ? "text" : "password"}
                  value={form.twilio_auth_token}
                  onChange={(e) => setForm({ ...form, twilio_auth_token: e.target.value })}
                  placeholder="..."
                  className="shadcn-input flex-1"
                  data-testid="notif-tw-token"
                />
                <button type="button" onClick={() => setShow({ ...show, auth: !show.auth })} className="px-3 border border-l-0 border-black/15 hover:bg-neutral-50">
                  {show.auth ? <EyeSlash size={16} weight="duotone" /> : <Eye size={16} weight="duotone" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider font-medium">From (Twilio WhatsApp)</label>
              <input
                value={form.twilio_whatsapp_from}
                onChange={(e) => setForm({ ...form, twilio_whatsapp_from: e.target.value })}
                placeholder="whatsapp:+14155238886"
                className="shadcn-input mt-2"
                data-testid="notif-tw-from"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider font-medium">Saņēmējs (To)</label>
              <input
                value={form.whatsapp_to_default}
                onChange={(e) => setForm({ ...form, whatsapp_to_default: e.target.value })}
                placeholder="whatsapp:+37125522773"
                className="shadcn-input mt-2"
                data-testid="notif-tw-to"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.enabled_whatsapp} onChange={(e) => setForm({ ...form, enabled_whatsapp: e.target.checked })} data-testid="notif-tw-enabled" />
              Ieslēgts WhatsApp sūtīšanai
            </label>
            <p className="text-xs text-neutral-500 leading-relaxed">
              💡 Sandbox: saņēmējam jānosūta "join &lt;kods&gt;" uz Twilio sandbox numuru, lai apstiprinātu opt-in.
            </p>
          </div>
        </div>

        <button onClick={save} disabled={busy} className="btn-primary mt-6" data-testid="notif-save-btn">
          <FloppyDisk size={16} weight="duotone" /> {busy ? "Saglabā..." : "Saglabāt iestatījumus"}
        </button>
      </div>

      {/* Test sender */}
      <div className="border border-black/10 p-6 mb-8">
        <div className="font-display font-bold text-lg mb-3">Pārbaudīt sūtīšanu</div>
        <textarea
          rows={2}
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          className="shadcn-input"
          data-testid="notif-test-message"
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <button onClick={() => sendTest("telegram")} disabled={testing === "telegram"} className="btn-secondary" data-testid="notif-test-tg">
            <TelegramLogo size={16} weight="duotone" /> {testing === "telegram" ? "Sūta..." : "Pārbaudīt Telegram"}
          </button>
          <button onClick={() => sendTest("whatsapp")} disabled={testing === "whatsapp"} className="btn-secondary" data-testid="notif-test-wa">
            <WhatsappLogo size={16} weight="duotone" /> {testing === "whatsapp" ? "Sūta..." : "Pārbaudīt WhatsApp"}
          </button>
          <button onClick={() => sendTest("both")} disabled={testing === "both"} className="btn-primary" data-testid="notif-test-both">
            <PaperPlaneTilt size={16} weight="duotone" /> {testing === "both" ? "Sūta..." : "Sūtīt uz abiem"}
          </button>
        </div>
      </div>

      {/* Log */}
      <div className="border border-black/10 p-6">
        <div className="font-display font-bold text-lg mb-3">Paziņojumu žurnāls ({log.length})</div>
        {log.length === 0 ? (
          <div className="text-sm text-neutral-500">Vēl nav nosūtītu paziņojumu. Kad pasūtījums tiks apmaksāts, automātiski tiks nosūtīts uz piegādātāju.</div>
        ) : (
          <div className="space-y-2 text-sm">
            {log.slice(0, 20).map((n) => (
              <div key={n.id} className="border-b border-black/5 py-3" data-testid={`notif-log-${n.id}`}>
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium">#{n.order_id?.slice(0, 8)} → {n.supplier_name}</div>
                    <div className="text-xs text-neutral-500">{new Date(n.sent_at).toLocaleString("lv")}</div>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge ok={n.telegram?.sent} label="TG" />
                    <StatusBadge ok={n.whatsapp?.sent} label="WA" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Robot, PaperPlaneRight, Sparkle } from "@phosphor-icons/react";
import api from "@/lib/api";

const QUICK = [
  "Cik pasūtījumu gaida nosūtīšanu?",
  "Kuriem piegādātājiem šodien jānosūta?",
  "Kāda kopējā summa par šo nedēļu?",
];

export default function AdminChat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Sveiks! Es esmu administrēšanas AI. Varu palīdzēt apstrādāt pasūtījumus, izsekot piegādātājus un pārvaldīt atlaides. Ko vēlies darīt?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ctx, setCtx] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const message = text ?? input.trim();
    if (!message || sending) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setSending(true);
    try {
      const { data } = await api.post("/admin/chat", { message, session_id: sessionId });
      if (!sessionId) setSessionId(data.session_id);
      setCtx(data.context);
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Bots šobrīd nav pieejams." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-black/10" data-testid="admin-chat">
      <div className="flex items-center justify-between bg-black text-white px-5 py-4">
        <div className="flex items-center gap-3">
          <Robot size={24} weight="duotone" />
          <div>
            <div className="font-display font-bold text-sm uppercase tracking-wider">Admin AI</div>
            <div className="text-xs text-neutral-300">Automātiska pasūtījumu apstrāde</div>
          </div>
        </div>
        {ctx && (
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <div><span className="opacity-70">Apmaksāti:</span> <strong>{ctx.pending_paid_orders}</strong></div>
            <div><span className="opacity-70">Atlaides:</span> <strong>{ctx.active_codes}</strong></div>
          </div>
        )}
      </div>
      <div className="h-[420px] overflow-y-auto p-4 space-y-3 bg-neutral-50">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"}>
            {m.text}
          </div>
        ))}
        {sending && <div className="chat-bubble-bot opacity-70">Domā...</div>}
        {messages.length <= 1 && (
          <div className="pt-2 space-y-2">
            <div className="text-xs uppercase tracking-wider text-neutral-500 font-medium flex items-center gap-1.5">
              <Sparkle size={12} weight="duotone" /> Ātrās komandas
            </div>
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                data-testid={`admin-chat-quick-${q.slice(0,12)}`}
                className="block w-full text-left text-sm px-3 py-2 border border-black/10 hover:bg-black hover:text-white bg-white transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-black/10 p-3 flex gap-2 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Pajautā botam..."
          className="shadcn-input flex-1 text-sm"
          data-testid="admin-chat-input"
          disabled={sending}
        />
        <button
          onClick={() => send()}
          disabled={sending}
          data-testid="admin-chat-send"
          className="bg-black text-white px-4 disabled:opacity-50 hover:bg-neutral-800"
        >
          <PaperPlaneRight size={18} weight="duotone" />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { ChatCircleDots, X, PaperPlaneRight } from "@phosphor-icons/react";
import api from "@/lib/api";

const QUICK_REPLIES = [
  "Vai iPhone 17 Pro Max ir krājumā?",
  "Kādas smaržas iesakāt?",
  "Kā notiek maksājumi?",
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Sveiki! Es esmu Veikala AI palīgs. Varu palīdzēt atrast produktus, atbildēt par cenu vai piegādi. Kā varu palīdzēt?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (text) => {
    const message = text ?? input.trim();
    if (!message || sending) return;
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setSending(true);
    try {
      const { data } = await api.post("/chat", { message, session_id: sessionId });
      if (!sessionId) setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Atvainojiet, šobrīd nevarēju atbildēt. Mēģiniet vēlreiz." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="chatbot-launcher"
          className="fixed bottom-6 right-6 z-50 bg-black text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 hover:bg-neutral-800 transition-transform hover:scale-105"
        >
          <ChatCircleDots size={20} weight="duotone" />
          <span className="text-sm font-medium uppercase tracking-wider">Vajag palīdzību?</span>
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[380px] h-[520px] bg-white border border-black/10 shadow-2xl flex flex-col" data-testid="chatbot-panel">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 bg-black text-white">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider">Veikals AI</div>
              <div className="text-xs text-neutral-300">Tiešsaistē • Atbild ātri</div>
            </div>
            <button onClick={() => setOpen(false)} data-testid="chatbot-close" className="hover:opacity-70">
              <X size={20} weight="bold" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"} data-testid={`chat-msg-${m.role}-${i}`}>
                {m.text}
              </div>
            ))}
            {sending && <div className="chat-bubble-bot opacity-70">Raksta...</div>}
            {messages.length <= 1 && (
              <div className="pt-2 space-y-2">
                <div className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Ātrās atbildes</div>
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    data-testid={`chat-quick-${q.slice(0,15)}`}
                    className="block w-full text-left text-sm px-3 py-2 border border-black/10 hover:bg-black hover:text-white transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-black/10 p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Uzraksti jautājumu..."
              className="shadcn-input flex-1 text-sm"
              data-testid="chatbot-input"
              disabled={sending}
            />
            <button
              onClick={() => send()}
              disabled={sending}
              data-testid="chatbot-send"
              className="bg-black text-white px-4 disabled:opacity-50 hover:bg-neutral-800"
            >
              <PaperPlaneRight size={18} weight="duotone" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, KeyboardEventHandler } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { API_BASE } from "@/lib/api";

type ChatMessage = {
  from: "user" | "bot";
  text: string;
  payload?: any;
  type?: string;
};

const API = API_BASE;

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "bot",
      text: "Hi! Ask me about products, prices, ratings or help. For example: 'Show pizza', 'Products under 200', 'Top rated products', 'Food vendors', or 'How to book?'.",
      type: "help",
    },
  ]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/chatbot/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      const replyText: string =
        data.reply ||
        "Okay. You can also ask 'Show pizza', 'Products under 200', 'Top rated products', 'Food vendors', or 'How to book?'.";
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: replyText,
          payload: data.products || data.vendors || null,
          type: data.type,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Sorry, I had a problem answering that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open ? (
        <Card className="flex h-96 w-80 flex-col shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Assistant</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-xs"
              onClick={() => setOpen(false)}
            >
              ×
            </Button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={m.from === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    m.from === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p>{m.text}</p>
                  {m.from === "bot" &&
                  Array.isArray(m.payload) &&
                  m.payload.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs">
                      {m.payload.map((item: any) => (
                        <li key={item._id || item.id}>
                          {"price" in item ? (
                            <>
                              <span className="font-semibold">{item.name}</span>
                              {item.vendor_name ? (
                                <span className="ml-1 text-muted-foreground">
                                  by {item.vendor_name}
                                </span>
                              ) : null}
                              <span className="ml-1">· ₹{item.price}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">
                                {item.name || item.vendor_name || item.email}
                              </span>
                              {item.email ? (
                                <span className="ml-1 text-muted-foreground">
                                  ({item.email})
                                </span>
                              ) : null}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-muted-foreground">Thinking…</p>
            )}
          </div>

          <div className="flex gap-2 border-t px-3 py-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products, prices, or help…"
              className="h-9 text-sm"
            />
            <Button
              size="sm"
              className="h-9"
              disabled={loading}
              onClick={() => void send()}
            >
              Send
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default ChatbotWidget;


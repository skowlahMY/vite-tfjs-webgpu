// src/components/GraniteRag.jsx
import { useState, useRef, useEffect } from "react";
import "./GraniteChatbot.css";
import gfislogo from "/gfis-logo.png";

export default function GraniteChatbot() {
  const [status, setStatus] = useState("Idle");
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', text:string}
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef();
  const chatRef = useRef(null);
  const workerRef = useRef(null);

  // -------------------------
  // INIT WORKER
  // -------------------------
  useEffect(() => {
    const w = new Worker(new URL("../workers/graniteWorkerChatbot.js", import.meta.url), {
      type: "module",
    });
    workerRef.current = w;

    w.onmessage = (e) => {
      const { type, message } = e.data;

      if (type === "status") {
        setStatus(message);
        return;
      }

      if (type === "error") {
        setStatus("❌ " + message);
        setIsGenerating(false);
        // Remove placeholder bubble on error
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (type === "done") {
        setStatus("✅ Done");
        setIsGenerating(false);

        setMessages((prev) => {
          const updated = [...prev];
          let idx = -1;
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].role === "assistant") {
              idx = i;
              break;
            }
          }

          if (idx !== -1) {
            updated[idx] = { ...updated[idx], text: message };
          } else {
            updated.push({ role: "assistant", text: message });
          }
          return updated;
        });
      }
    };

    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  // -------------------------
  // AUTO SCROLL CHAT
  // -------------------------
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // -------------------------
  // BUTTON HANDLERS
  // -------------------------
  const handleDownload = () => {
    workerRef.current?.postMessage({ type: "download" });
  };

  const handleReset = () => {
    workerRef.current?.postMessage({ type: "reset" });
    setMessages([]);
    setStatus("🧹 Chat reset.");
  };

  const handleSend = () => {
    const userText = inputRef.current.value.trim();
    if (!userText || isGenerating) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      { role: "assistant", text: "..." },
    ]);
    inputRef.current.value = "";
    setIsGenerating(true);
    setStatus("⏳ Generating...");

    workerRef.current?.postMessage({
      type: "user_message",
      payload: { text: userText },
    });
  };

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <div className="chat-container">
      <header className="chat-header">
        <img src={gfislogo} className="chat-logo" />
        <h1 className="chat-title">GFIS Chatbot</h1>

        <div className="button-group">
          <span
            className={`status-pill ${
              status.startsWith("✅")
                ? "ok"
                : status.startsWith("❌")
                ? "error"
                : ""
            }`}
          >
            {status}
          </span>

          <button onClick={handleDownload} className="primary-btn small">
            Download Model
          </button>

          <button onClick={handleReset} className="primary-btn small">
            Reset
          </button>

        </div>
      </header>

      <main className="chat-window" ref={chatRef}>
        {messages.length === 0 && (
          <div className="chat-placeholder">
            <p>💬 Ask me anything about GFIS</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            <div className={`bubble ${m.role}`}>
              {isGenerating && m.role === "assistant" && m.text === "..." ? (
                <span className="typing-indicator">...</span>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
      </main>

      <footer className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Type your message here..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button onClick={handleSend} className="accent-btn send-btn" disabled={isGenerating}>
          {isGenerating ? "..." : "Send"}
        </button>
      </footer>
    </div>
  );
}

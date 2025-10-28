import { useState, useRef, useEffect } from 'react';
import './GFISPTABot.css';
import Live2DCanvas from './Live2DCanvas';

const chat_setting = {
  system: `You are Aina, a cheerful and helpful sales executive of GFIS promoting the product RMMA PTA. Answer questions ONLY using the context provided. If someone asks about unrelated things, answer briefly and ask for RMMA PTA related questions.`,
  intro: "Hi! 🎉 Aina here! Can I help you with our product RMMA PTA?"
};


export default function GFISPTABot() {
  const formRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastHits, setLastHits] = useState([]); // RAG top-k for the last answer
  const inputRef = useRef();
  const chatRef = useRef(null);
  const workerRef = useRef(null);

  // -------------------------
  // INIT WORKER
  // -------------------------
  useEffect(() => {
    // IMPORTANT: use the new RAG-enabled worker filename
    const w = new Worker(new URL("../workers/gfisPTAChatbot.js", import.meta.url), {
      type: "module",
    });
    workerRef.current = w;

    w.onmessage = (e) => {
      const { type, message, hits } = e.data;

      if (type === "status") {
        setStatus(message);
        return;
      }

      if (type === "ready") {
        setStatus(message);
        return;
      }

      if (type === "error") {
        setStatus("❌ " + message);
        setIsGenerating(false);
        return;
      }

      // RAG: show retrieval hits (lightweight "citations")
      if (type === "rag:hits") {
        setLastHits(hits || []);
        return;
      }

      if (type === "done") {
        setStatus("✅ Done");
        setIsGenerating(false);
        if (inputRef.current) inputRef.current.value = "";

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: message }
        ]);
        return;
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
  // EAGER LOAD: model + embeddings + embedder
  // -------------------------
  useEffect(() => {

    const boot = async () => {
      try {
        // 1) Load Granite LLM
        workerRef.current?.postMessage({ type: "download" });

        // 2) Fetch embeddings JSON
        setStatus("⬇️ Loading embeddings…");
        console.log("load embeddings...")

        try {

          const response = await fetch(`multilingual_embeddings.json`);
          console.log("Response status:", response.status);

          if (!response.ok) {
            console.log("fail to start")
            throw new Error(`HTTP error! Status: ${response.status} for ${EMBEDDINGS_URL}`);
          }

          const kb = await response.json();

          // 🎯 Check 2: Check if the parsed object (kb) is an array with content
          if (!Array.isArray(kb) || kb.length === 0) {
            throw new Error("Embeddings file loaded but is empty or not an array.");
          }

          console.log(`✅ Fetched and parsed ${kb.length} embedding rows.`);

          // 3) Normalize rows for the worker (combine title+text like in Python)
          const rows = kb.map((r, i) => ({
            id: r.id ?? `row-${i}`,
            text: `${r.title ?? ""}\n\n${r.text ?? ""}`.trim(),
            embedding: r.embedding,
            source: r.source ?? null,
          }));

          // 4) Send to worker to build the index
          workerRef.current?.postMessage({ type: "rag:load", payload: { rows } });

          // 5) Load embedder (intfloat/multilingual-e5-small)
          workerRef.current?.postMessage({ type: "rag:load-embedder" });

        }
        catch (innerError) {
          console.error("Error during embedding fetch or parsing:", innerError);
          setStatus("❌ Embeddings failed: " + innerError.message);
          return; // Exit boot function on failure
        }



      } catch (e) {
        setStatus("❌ Failed to load embeddings: " + (e?.message || e));
      }
    }
    boot();
  }, []);

  // -------------------------
  // BUTTON HANDLERS
  // -------------------------

  const handleReset = () => {
    workerRef.current?.postMessage({ type: "reset" });
    setMessages([]);
    setLastHits([]);
    setStatus("🧹 Chat reset.");
  };

  const handleSend = () => {
    //handling model not loaded by way of status
    if (status === "Idle") {
      window.alert("Model not loaded");
      return;
    }

    // if (!status.includes("Ready")) {
    //   window.alert("System is not ready yet. Current status: " + status);
    //   return;
    // }

    const userText = (inputRef.current?.value || "").trim();
    if (!userText || isGenerating) return;

    // append the user message to UI
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    // reset last hits so we don’t show stale citations under the next answer
    setLastHits([]);

    setIsGenerating(true);
    setStatus("⏳ Generating...");

    try {
      // Build prior chat for worker (exclude the intro bubble)
      const prior = [
        { role: "system", content: chat_setting.system },
        ...messages
      ];

      // Send using the worker's RAG-aware contract:
      // payload: { messages, userText }
      workerRef.current?.postMessage({
        type: "generate",
        payload: {
          messages: prior,
          userText, // RAG will retrieve using this, then inject context + call LLM
        },
      });
    } catch (error) {
      console.error("Error getting response from worker", error);
      setIsGenerating(false);
      setStatus("❌ " + (error?.message || String(error)));
    }
  };

  return (
    <div className="chat-container">
      <div className="left-column">
        <div className="waifu-card">
          <div style={{ height: '300px', width: '300px', marginBottom: '5px' }}>
            <Live2DCanvas />
          </div>
          <div className={`status-pill ${status.startsWith("✅") ? "ok" : status.startsWith("❌") ? "error" : ""}`}>
            {status}
          </div>
          <button onClick={handleReset} className="primary-btn small">
            Reset
          </button>
        </div>
      </div>

      <div className="right-column">
        <div className="card">
          <div className="card-header">
            <strong>GFIS Chat Bot</strong>
          </div>

          <div className="card-body" ref={chatRef}>
            <div className="convo left-convo">
              <div
                className="bubble left-convo-bubble"
                style={{ maxWidth: '70%', borderRadius: '0.5rem 0.5rem 0.5rem 0rem' }}
              >
                {chat_setting.intro}
              </div>
            </div>

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`convo ${msg.role === "user" ? 'right-convo' : 'left-convo'}`}
              >
                <div className={`bubble ${msg.role === "user" ? 'right-convo-bubble' : 'left-convo-bubble'}`}>
                  {msg.content}
                </div>

                {/* Show citations under ASSISTANT messages if present
                {msg.role !== 'user' && lastHits.length > 0 && index === messages.length - 1 && (
                  <div className="citations">
                    <small>
                      Context sources:&nbsp;
                      {lastHits.map((h, i) => (
                        <span key={i} className="citation-chip" title={h.preview}>
                          【{h.rank}】{h.meta?.source ? ` ${h.meta.source}` : ` chunk#${h.rank}`} — {h.score}
                        </span>
                      ))}
                    </small>
                  </div>
                )} */}
              </div>
            ))}
          </div>

          <div className="card-footer">
            <div className="form-group">
              <textarea
                ref={inputRef}
                className="form-control"
                rows={3}
                placeholder="Type your message..."
                name="usrinput"
              />
              <button type="button" onClick={handleSend} className="btn btn-primary ms-2" disabled={isGenerating}>
                {isGenerating ? "Thinking…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tiny styles for citation chips (optional)
      <style jsx>{`
        .citations { margin-top: 6px; opacity: 0.85; }
        .citation-chip { display: inline-block; margin-right: 6px; padding: 2px 6px; border-radius: 8px; background: rgba(127,127,127,0.15); }
      `}</style> */}
    </div>
  );
}

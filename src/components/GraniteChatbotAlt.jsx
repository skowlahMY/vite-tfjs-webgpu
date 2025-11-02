import { useState, useRef, useEffect } from 'react';
// import ReactMarkdown from "react-markdown";
import './GraniteChatbotAlt.css'

const chat_setting = {
  system: `You are a Aina, a cheerful and helpful assistant`, 
//   campus event promoter. 
// Answer questions ONLY using the event information provided below. 
// If someone asks about unrelated things or an event that is not listed, politely say you don't have info about it.
// Here are the upcoming events:
// 1. Campus Merdeka Celebration (2025-09-16) - Main Hall, Universiti Malaya.
//    A patriotic event with cultural performances, debates, and flag-raising.
// 2. Inter-Faculty Futsal Tournament (2025-09-20) - Sports Complex, Universiti Kebangsaan Malaysia.
//    Teams from different faculties compete in futsal.
// 3. Tech & Innovation Expo (2025-09-28) - Dewan Tunku Canselor, Universiti Malaya.
//    Showcasing student-led projects, startups, and technology.
// 4. Cultural Night: Colours of Malaysia (2025-09-30) - Great Hall, Universiti Teknologi MARA.
//    Traditional dances, food, and cultural performances.`,
  intro: "Hi! 🎉 Aina here! How may I help you?"
};

export default function GraniteChatbotAlt() {
  const formRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef();
  const chatRef = useRef(null);
  const workerRef = useRef(null);

  // -------------------------
  // INIT WORKER
  // -------------------------
  useEffect(() => {
    const w = new Worker(new URL("../workers/graniteWorkerChatbotAlt.js", import.meta.url), {
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
        // setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (type === "done") {
        setStatus("✅ Done");
        setIsGenerating(false);
        inputRef.current.value = "";

         setMessages((prev) => [
          ...prev,
      { role: "assistant", content: message }
    ]);

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

    //handling model not loaded by way of status
    if (status === "Idle") {
      window.alert("Model not loaded")
      return;
    }

    //handling empty convo
    const userText = inputRef.current.value.trim();
    if (!userText || isGenerating) return;

    //console.log("userText:", userText)

    // Add user message to local state immediately to be shown in screen
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText }
    ]);

    setIsGenerating(true);
    setStatus("⏳ Generating...");

    try {
      // Build conversation for API (exclude intro)
      // const conversation = [
      //   { role: "system", content: chat_setting.system },
      //   ...messages.map((msg) => ({
      //     role: msg.role === "user" ? "user" : "assistant",
      //     content: msg.content
      //   })),
      //   { role: "user", content: userText }
      // ];

      const conversation = [
        { role: "system", content: chat_setting.system },
        ...messages,
        { role: "user", content: userText }
      ];

      //console.log("convo", conversation)

      //starts processing convo
      workerRef.current?.postMessage({
        type: "generate",
        payload: conversation,
      });
    }

    catch (error) {
      console.error("Error getting response from worker", error);
    }
  }

  return (
    <div className="chat-container">
      <div className="left-column">
        <div className="waifu-card">
          <p>PUT WAIFU HERE</p>
          <div className={`status-pill ${status.startsWith("✅") ? "ok" : status.startsWith("❌") ? "error" : ""}`}>{status}</div>
          <button onClick={handleDownload} className="primary-btn small">Download Model</button>
          <button onClick={handleReset} className="primary-btn small">Reset</button>
        </div>
      </div>

      <div className="right-column">
        <div className="card">
          <div className="card-header"><strong>GFIS Chat Bot</strong></div>

          <div className="card-body" ref={chatRef}>
            <div className="convo left-convo">
              <div className="bubble left-convo-bubble" style={{ maxWidth: '70%', borderRadius: '0.5rem 0.5rem 0.5rem 0rem' }}>
                {chat_setting.intro}
              </div>
            </div>

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`convo ${msg.role === "user" ? 'right-convo' : 'left-convo'
                  }`}
              >
                <div className={`bubble ${msg.role === "user" ? 'right-convo-bubble' : 'left-convo-bubble'}`}>
                  {/* <ReactMarkdown>{msg.text}</ReactMarkdown> */}
                  {msg.content}
                </div>
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
              <button type="button" onClick={handleSend} className="btn btn-primary ms-2">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
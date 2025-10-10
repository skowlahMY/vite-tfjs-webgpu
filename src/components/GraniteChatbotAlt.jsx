import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from "react-markdown";
import './GraniteChatbotAlt.css'

const chat_setting = {
  system: `You are a Ayna, a cheerful, uwu and cute helpful campus event promoter. 
Answer questions ONLY using the event information provided below. 
If someone asks about an event not listed, politely say you don't have info about it.
Here are the upcoming events:
1. Campus Merdeka Celebration (2025-09-16) - Main Hall, Universiti Malaya.
   A patriotic event with cultural performances, debates, and flag-raising.
2. Inter-Faculty Futsal Tournament (2025-09-20) - Sports Complex, Universiti Kebangsaan Malaysia.
   Teams from different faculties compete in futsal.
3. Tech & Innovation Expo (2025-09-28) - Dewan Tunku Canselor, Universiti Malaya.
   Showcasing student-led projects, startups, and technology.
4. Cultural Night: Colours of Malaysia (2025-09-30) - Great Hall, Universiti Teknologi MARA.
   Traditional dances, food, and cultural performances.`,
  intro: "Hi! 🎉 Ayna here! How may I help you?"
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
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      if (type === "done") {
        setStatus("✅ Done");
        setIsGenerating(false);

        // chatbot response, add to messages
        // only show answer part in conversation box

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

  async function sendMessage(e) {
    e.preventDefault();
    let userInput = e.target.usrinput.value;

    if (userInput.trim() === '') return;

    // Add user message to local state immediately
    setMessages((prevMessages) => [
      ...prevMessages,
      { text: userInput, sender: 'user' }
    ]);

    try {
      // Build conversation for API (exclude intro)
      const conversation = [
        { role: "system", content: chat_setting.system },
        ...messages.map((msg) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: userInput }
      ];

      setIsGenerating(true);
      setStatus("⏳ Generating...");

      workerRef.current?.postMessage({
        type: "conversation",
        payload: conversation,
      });
    }

    catch (error) {
      console.error("Error getting response from worker", error);
      // setMessages((prevMessages) => [
      //   ...prevMessages,
      //   { text: "⚠️ Error: could not connect to model.", sender: "system" }
      // ]);
    }

    finally {
      formRef.current.reset();
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
                className={`convo ${msg.sender === 'user' ? 'right-convo' : 'left-convo'
                  }`}
              >
                <div className={`bubble ${msg.sender === 'user' ? 'right-convo-bubble' : 'left-convo-bubble'}`}>
                  {/* <ReactMarkdown>{msg.text}</ReactMarkdown> */}
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="card-footer">
            <form ref={formRef} onSubmit={sendMessage}>
              <div className="form-group">
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Type your message..."
                  name="usrinput"
                />
                <button type="submit" className="btn btn-primary ms-2">
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
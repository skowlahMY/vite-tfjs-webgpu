import { useState, useRef } from "react";
import "./Granite.css";

export default function Granite() {
  const [status, setStatus] = useState("Idle");
  const [output, setOutput] = useState("");

  const inputRef = useRef();
  const workerRef = useRef(null);

  if (!workerRef.current) {
    workerRef.current = new Worker(
      new URL("../workers/graniteWorker.js", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (e) => {
      const { type, message } = e.data;
      if (type === "status") setStatus(message);
      else if (type === "error") setStatus("❌ " + message);
      else if (type === "stream") setOutput((prev) => prev + message);
      else if (type === "done") {
        setStatus("✅ Done");
        setOutput(message);
      }
    };
  }

  const handleDownload = () => workerRef.current.postMessage({ type: "download" });
  const handleGenerate = () => {
    const prompt = inputRef.current.value.trim();
    if (!prompt) return;
    setOutput("");
    setStatus("⏳ Generating...");
    workerRef.current.postMessage({ type: "generate", payload: { prompt } });
  };

  return (
    <div className="granite-container">
      <div className="granite-card">
        <h1 className="granite-title">🧠 Granite LLM Inference</h1>

        <div className="button-row">
          <div className="status-bar">
            <span className={`status-pill ${status.startsWith("✅") ? "ok" : status.startsWith("❌") ? "error" : ""}`}>
              {status}
            </span>
          </div>
          <button onClick={handleDownload} className="primary-btn">
            Download Model
          </button>
        </div>

        <div className="prompt-section">
          <label id="promptlabel" htmlFor="prompt">Enter your prompt:</label>
          <textarea
            id="prompt"
            ref={inputRef}
            placeholder="Type your question or instruction here"
            className="prompt-input"
            rows={4}
          />
        </div>

        <div className="button-row">
          <button onClick={handleGenerate} className="accent-btn">
            Generate
          </button>
        </div>

        <div className="output-section">
          <label id="outputlabel" htmlFor="outputbox">Model Output:</label>
          <textarea
            defaultValue={output}
            placeholder="Waiting for output"
            className="output-box"
            id="outputbox"
            rows={8}
          />
        </div>
      </div>
    </div>
  );
}

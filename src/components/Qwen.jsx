import { useState, useRef } from "react";
import './Qwen.css';

export default function Qwen() {
  const [status, setStatus] = useState("Idle");
  const [output, setOutput] = useState("");
  const inputRef = useRef();
  const workerRef = useRef(null);

  // Initialize worker
  if (!workerRef.current) {
    workerRef.current = new Worker(new URL("../workers/qwenWorker.js", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (e) => {
      const { type, message } = e.data;
      if (type === "status") setStatus(message);
      else if (type === "error") setStatus("❌ " + message);
      else if (type === "stream") setOutput((prev) => prev + message);
      else if (type === "done") {
        setStatus("✅ Done");
        setOutput(message)
      }
    };
  }

  function downloadModel() {
    workerRef.current.postMessage({ type: "download" });
  }

  function processUserInput() {
    const prompt = inputRef.current.value;
    setOutput("");
    setStatus("Generating...");
    workerRef.current.postMessage({ type: "generate", payload: { prompt } });
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Qwen Page</h1>
      <p>Status: {status}</p>

      <button onClick={downloadModel}>Download Model</button>

      <div className="promptbox">
        <textarea
          ref={inputRef}
          placeholder="Type your prompt here"
          row={10}
          cols={80}
        />
        <br/>
        <button onClick={processUserInput}>Process</button>
      </div>

      <textarea
        readOnly
        rows={20}
        cols={80}
        style={{ marginTop: "1rem", display: "block" }}
        defaultValue={output}
      ></textarea>
    </div>
  );
}

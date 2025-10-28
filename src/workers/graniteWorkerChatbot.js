// src/workers/graniteWorkerChatbot.js
import { pipeline } from "@huggingface/transformers";

let generator = null;

// Persistent conversation memory (lives inside worker)
let conversation = [
  {
    role: "system",
    content: "You are a helpful assistant. Answer in the same language as the user.",
  },
];

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  // -------------------------
  // LOAD MODEL
  // -------------------------
  if (type === "download") {
    self.postMessage({ type: "status", message: "Loading model..." });
    try {
      generator = await pipeline(
        "text-generation",
        "onnx-community/granite-4.0-micro-ONNX-web",
        { device: "webgpu" }
      );
      self.postMessage({ type: "status", message: "✅ Model loaded" });
    } catch (e) {
      self.postMessage({ type: "error", message: e.message });
    }
  }

  // -------------------------
  // RESET CHAT MEMORY
  // -------------------------
  if (type === "reset") {
    conversation = [
      {
        role: "system",
        content: "You are a helpful assistant. Answer in the same language as the user.",
      },
    ];
    self.postMessage({ type: "status", message: "🧹 Chat reset." });
  }

  // -------------------------
  // HANDLE USER MESSAGE
  // -------------------------
  if (type === "user_message") {
    if (!generator) {
      self.postMessage({ type: "error", message: "Model not loaded yet!" });
      return;
    }

    const userText = payload?.text?.trim();
    if (!userText) {
      self.postMessage({ type: "error", message: "Empty user message." });
      return;
    }

    // Add user message to internal memory
    conversation.push({ role: "user", content: userText });
    self.postMessage({ type: "status", message: "⏳ Generating..." });

    try {

      // ⏱️ Start timing
      const start = performance.now();

      const output = await generator(conversation, {
        max_new_tokens: 512,
        do_sample: false,
      });

      // ⏱️ End timing
      const end = performance.now();
      const elapsed = (end - start) / 1000; // seconds

      // Extract only the assistant’s reply
      const raw = output?.[0]?.generated_text ?? [];
      let assistantReply = "";

      // token count
      let tokenCount = 0;

      if (Array.isArray(raw)) {
        const last = raw.reverse().find((msg) => msg.role === "assistant");
        assistantReply = last?.content ?? "⚠️ (no response)";
      } else if (typeof raw === "object" && raw.content) {
        assistantReply = raw.content;
      } else if (typeof raw === "string") {
        assistantReply = raw;
      } else {
        assistantReply = JSON.stringify(raw);
      }

      // Rough token count = whitespace split (approx)
      tokenCount = assistantReply.split(/\s+/).length;
      const tps = (tokenCount / elapsed).toFixed(2);
      console.log(
        `🧠 Generated ${tokenCount} tokens in ${elapsed.toFixed(
          2
        )}s → ${tps} tokens/s`
      );

      // Add to memory
      conversation.push({ role: "assistant", content: assistantReply });

      // Send back only this new reply
      self.postMessage({ type: "done", message: assistantReply });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }
};

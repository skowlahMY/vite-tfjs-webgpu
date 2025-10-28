import { pipeline } from "@huggingface/transformers";

let generator = null;

// Lazy load model only when requested
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  //this is to download model
  if (type === "download") {
    self.postMessage({ type: "status", message: "Loading model..." });
    try {
      generator = await pipeline("text-generation", "onnx-community/granite-4.0-micro-ONNX-web", {
        device: "webgpu",
      });
      self.postMessage({ type: "status", message: "✅ Model loaded successfully." });
    } catch (e) {
      self.postMessage({ type: "error", message: e.message });
    }
  }

  //this is to reset convo
  if (type === "reset") {
    console.log("resetting convo")
    // conversation = [
    //   {
    //     role: "system",
    //     content: "You are a helpful assistant. Answer in the same language as the user.",
    //   },
    // ];
    self.postMessage({ type: "status", message: "🧹 Chat reset." });
  }


  //this is handling user message
  if (type === "generate") {

    if (!generator) {
      self.postMessage({ type: "error", message: "Model not loaded yet!" });
      return;
    }

    //running chat to llm
    console.log("running chat to llm")
    console.log("payload:", payload)

    try {

      const output = await generator(payload, {
        max_new_tokens: 512,
        do_sample: false,
      });

      const raw = output?.[0]?.generated_text ?? [];
      //console.log("raw:", raw)

      let assistantReply = "";

      if (Array.isArray(raw)) {
        const last = raw.reverse().find((msg) => msg.role === "assistant");
        assistantReply = last?.content ?? "⚠️ (no response)";
      }
      else if (typeof raw === "object" && raw.content) {
        assistantReply = raw.content;
      }
      else if (typeof raw === "string") {
        assistantReply = raw;
      }
      else {
        assistantReply = JSON.stringify(raw);
      }

      //console.log("ar:", assistantReply)

      self.postMessage({ type: "done", message: assistantReply });
      //   self.postMessage({
      //     type: "done",
      //     message: output[0].generated_text.at(-1).content,
      //   });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }
};

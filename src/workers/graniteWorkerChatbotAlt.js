import { pipeline, TextStreamer } from "@huggingface/transformers";

let generator = null;

// Lazy load model only when requested
self.onmessage = async (event) => {
  const { type, payload } = event.data;

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

  if (type === "generate") {
    
    if (!generator) {
      self.postMessage({ type: "error", message: "Model not loaded yet!" });
      return;
    }

    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: payload.prompt },
    ];

    try {
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        on_text: (chunk) => {
          self.postMessage({ type: "stream", message: chunk });
        },
      });

      const output = await generator(messages, {
        max_new_tokens: 512,
        do_sample: false,
        streamer,
      });

      self.postMessage({
        type: "done",
        message: output[0].generated_text.at(-1).content,
      });
    } catch (err) {
      self.postMessage({ type: "error", message: err.message });
    }
  }
};

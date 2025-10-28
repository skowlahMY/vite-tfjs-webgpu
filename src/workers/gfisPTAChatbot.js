// gfisPTAChatbot.js (Web Worker)
// — RAG-enabled Granite micro ONNX chatbot —
//
// Message types you can send from UI:
//  - { type: "download" }
//  - { type: "reset" }
//  - { type: "rag:load", payload: { rows: [{ id?, text, embedding, source? }, ...] } }
//  - { type: "rag:load-embedder", payload: { modelId?: string } } // defaults to intfloat/multilingual-e5-small
//  - { type: "rag:config", payload: { topK?, maxContextChars?, instruction? } }
//  - { type: "generate", payload: string | {
//        messages?: Array<{role:"system"|"user"|"assistant", content:string}>,
//        userText?: string,                 // required for RAG path
//        queryEmbedding?: number[]|Float32Array // optional; if passed, we won't compute in worker
//     }}
//
// Worker will post back:
//  - { type: "status", message: string }
//  - { type: "error", message: string }
//  - { type: "rag:hits", hits: Array<{rank, score, meta, preview}> }
//  - { type: "done", message: string }
//
// Assumptions:
//  - Your corpus embeddings were created with intfloat/multilingual-e5-small (SentenceTransformers)
//  - You did NOT use "passage:"/"query:" prefixes in Python -> we will not use them here either.

import { pipeline } from "@huggingface/transformers";

let generator = null;
let embedder = null;

// ------------------------ RAG Store ------------------------
const ragStore = {
  vectors: null,   // Float32Array (N * dim)
  dim: 0,
  texts: [],       // string per row
  meta: [],        // { id?, source? } per row
  ready: false,
};

let ragConfig = {
  topK: 5,
  maxContextChars: 2000,
  instruction:
    "Answer using ONLY the provided CONTEXT. If the answer is not in the context, say you don't know.",
};

// ------------------------ Math helpers ------------------------
function l2norm(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const inv = 1 / Math.sqrt(Math.max(sum, 1e-12));
  for (let i = 0; i < vec.length; i++) vec[i] *= inv;
  return vec;
}

function dot(a, aOff, b, bOff, dim) {
  let s = 0;
  for (let i = 0; i < dim; i++) s += a[aOff + i] * b[bOff + i];
  return s;
}

// Return top K by cosine (vectors are assumed L2-normalized)
function topKcosine(queryVec, K) {
  if (!ragStore.ready) return [];
  const { vectors, dim, texts, meta } = ragStore;

  let best = []; // [{score, idx}] sorted desc
  for (let i = 0, off = 0; i < texts.length; i++, off += dim) {
    const score = dot(queryVec, 0, vectors, off, dim);
    if (best.length < K) {
      best.push({ score, idx: i });
      best.sort((a, b) => b.score - a.score);
    } else if (score > best[best.length - 1].score) {
      best[best.length - 1] = { score, idx: i };
      best.sort((a, b) => b.score - a.score);
    }
  }

  return best.map(({ score, idx }) => ({
    score,
    text: texts[idx],
    meta: meta[idx],
    idx,
  }));
}

// ------------------------ RAG build & prompt ------------------------
async function buildRagIndex(rows) {
  if (!rows || !rows.length) throw new Error("Empty embeddings payload");

  const dim = rows[0].embedding.length;
  ragStore.dim = dim;
  ragStore.texts = new Array(rows.length);
  ragStore.meta = new Array(rows.length);

  const V = new Float32Array(rows.length * dim);

  rows.forEach((r, i) => {
    const emb = Float32Array.from(r.embedding);
    // Ensure normalized (Python used normalize_embeddings=True, but we normalize defensively)
    l2norm(emb);
    V.set(emb, i * dim);

    // Accept either explicit r.text or build from title+text (if caller mapped it earlier)
    ragStore.texts[i] = r.text ?? `${r.title ?? ""}\n\n${r.text ?? ""}`.trim();
    ragStore.meta[i] = { id: r.id ?? `row-${i}`, source: r.source ?? null };
  });

  ragStore.vectors = V;
  ragStore.ready = true;
}

function buildRagPrompt(snippets, userText) {
  const ctx = snippets
    .map((s, i) => `【${i + 1}】 ${s.text}`)
    .join("\n\n")
    .slice(0, ragConfig.maxContextChars);

  const systemMsg = {
    role: "system",
    content: `${ragConfig.instruction}\n\nYou will be given a CONTEXT block.`,
  };
  const contextMsg = {
    role: "system",
    content: `CONTEXT START\n${ctx}\nCONTEXT END`,
  };
  const userMsg = { role: "user", content: userText };
  return [systemMsg, contextMsg, userMsg];
}

// ------------------------ Embedder ------------------------
async function ensureEmbedder(modelId = "intfloat/multilingual-e5-small") {
  if (embedder) return;
  self.postMessage({ type: "status", message: "Loading embedder…" });
  embedder = await pipeline("feature-extraction", modelId, { device: "webgpu" });
  self.postMessage({ type: "status", message: "✅ Embedder ready." });
}

async function embedQuery(text) {
  // Your Python pipeline did NOT use "query:" prefix. Keep it raw.
  const out = await embedder(text, { pooling: "mean", normalize: true });
  // transformers.js returns { data: Float32Array } or nested array; normalize to Float32Array
  return Float32Array.from(out.data ?? out);
}

// ------------------------ Chat model load ------------------------
async function ensureChatModel() {
  if (generator) return;
  self.postMessage({ type: "status", message: "Loading model..." });
  generator = await pipeline(
    "text-generation",
    "onnx-community/granite-4.0-micro-ONNX-web",
    { device: "webgpu" }
  );
  self.postMessage({ type: "status", message: "✅ Model loaded successfully." });
}

// ------------------------ Message handler ------------------------
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  try {
    // 1) Load LLM
    if (type === "download") {
      await ensureChatModel();
      return;
    }

    // 2) Reset (stateless in worker — UI likely holds history)
    if (type === "reset") {
      self.postMessage({ type: "status", message: "🧹 Chat reset." });
      return;
    }

    //3) RAG config
    if (type === "rag:config") {
      console.log("init rag config")
      Object.assign(ragConfig, payload ?? {});
      self.postMessage({ type: "status", message: "⚙️ RAG config updated." });
      console.log("rag config updated")
      return;
    }

    // 4) Load corpus embeddings (precomputed JSON)
    if (type === "rag:load") {
      console.log("init rag load")
      await buildRagIndex(payload?.rows);
      self.postMessage({
        type: "status",
        message: `📚 RAG index ready with ${ragStore.texts.length} chunks (dim ${ragStore.dim}).`,
      });
      console.log("rag index ready")
      return;
    }

    // 5) Load embedder
    if (type === "rag:load-embedder") {
      await ensureEmbedder(payload?.modelId);
      self.postMessage({
        type: "ready",
        message: `📚 RAG embeddings loaded. Ready`,
      });
      return;
    }

    // 6) Generate (with RAG if possible)
    if (type === "generate") {
      await ensureChatModel();

      let userText = "";
      let prior = [];
      let queryVec = null;

      // Accept legacy string payload (non-RAG)
      if (typeof payload === "string") {
        userText = payload;
      } else {
        prior = payload?.messages ?? [];
        userText = payload?.userText ?? (typeof payload?.content === "string" ? payload.content : "");
        if (payload?.queryEmbedding) {
          const q = Float32Array.from(payload.queryEmbedding);
          l2norm(q);
          queryVec = q;
        }
      }

      let finalMessages = [];
      if (prior?.length) finalMessages = finalMessages.concat(prior);

      let ragSnippets = [];
      if (userText && ragStore.ready) {
        if (!queryVec) {
          await ensureEmbedder(); // use intfloat/multilingual-e5-small by default
          queryVec = await embedQuery(userText);
        }
        ragSnippets = topKcosine(queryVec, ragConfig.topK);

        // Send top-k to UI (for optional UI-side citations)
        self.postMessage({
          type: "rag:hits",
          hits: ragSnippets.map((h, i) => ({
            rank: i + 1,
            score: +h.score.toFixed(4),
            meta: h.meta,
            preview: h.text.slice(0, 160),
          })),
        });

        finalMessages = finalMessages.concat(buildRagPrompt(ragSnippets, userText));
      } else {
        // No RAG — just push the user message if provided
        if (userText) finalMessages.push({ role: "user", content: userText });
      }

      const output = await generator(finalMessages, {
        max_new_tokens: 512,
        do_sample: false,
      });

      const raw = output?.[0]?.generated_text ?? [];
      let assistantReply = "";

      if (Array.isArray(raw)) {
        const last = raw.slice().reverse().find((msg) => msg.role === "assistant");
        assistantReply = last?.content ?? "⚠️ (no response)";
      } else if (typeof raw === "object" && raw?.content) {
        assistantReply = raw.content;
      } else if (typeof raw === "string") {
        assistantReply = raw;
      } else {
        assistantReply = JSON.stringify(raw);
      }

      self.postMessage({ type: "done", message: assistantReply });
      return;
    }

    // Unknown type
    self.postMessage({ type: "error", message: `Unknown message type: ${type}` });
  } 
  catch (e) {
    self.postMessage({ type: "error", message: e?.message ?? String(e) });
  }
};

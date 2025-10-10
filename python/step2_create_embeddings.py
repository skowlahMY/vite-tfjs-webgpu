from sentence_transformers import SentenceTransformer
import json

# ✅ Use a multilingual embedding model instead of the English-only MiniLM

# Option 1 (lightweight, widely supported):
# model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Option 2 (higher accuracy for cross-lingual QA):
model_name = "intfloat/multilingual-e5-small"

# Option 3:
# model_name = SentenceTransformer("all-MiniLM-L6-v2")

print(f"🔄 Loading model: {model_name}")
model = SentenceTransformer(model_name)

# Load your chunked knowledge base
with open("chunks.json", "r", encoding="utf-8") as f:
    kb = json.load(f)

print(f"📚 Loaded {len(kb)} chunks")

# Compute embeddings
for item in kb:
    item["embedding"] = model.encode(
        item["text"],
        normalize_embeddings=True
    ).tolist()

# Save output
with open("multilingual_embeddings.json", "w", encoding="utf-8") as f:
    json.dump(kb, f, ensure_ascii=False, indent=2)

print("✅ Multilingual embeddings added → multilingual_embeddings.json")

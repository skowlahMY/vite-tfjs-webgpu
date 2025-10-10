from sentence_transformers import SentenceTransformer
import json

# Choose multilingual model
model_name = "intfloat/multilingual-e5-small"

print(f"🔄 Loading model: {model_name}")
model = SentenceTransformer(model_name)

# Load chunked knowledge base
with open("data/chunks.json", "r", encoding="utf-8") as f:
    kb = json.load(f)

print(f"📚 Loaded {len(kb)} chunks")

# Compute embeddings
for item in kb:
    # Combine title + text for richer context
    combined_text = f"{item['title']}\n\n{item['text']}"
    item["embedding"] = model.encode(
        combined_text,
        normalize_embeddings=True
    ).tolist()

# Save output
with open("data/multilingual_embeddings.json", "w", encoding="utf-8") as f:
    json.dump(kb, f, ensure_ascii=False, indent=2)

print("✅ Multilingual embeddings added → multilingual_embeddings.json")

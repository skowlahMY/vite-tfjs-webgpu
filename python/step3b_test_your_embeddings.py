from sentence_transformers import SentenceTransformer
import json
import numpy as np

# Load your multilingual embeddings file
kb = json.load(open("data/multilingual_embeddings.json"))
print(f"Loaded {len(kb)} chunks")

# Create the same model for query encoding
model = SentenceTransformer("intfloat/multilingual-e5-small")

# Example Malay query
query = "Apa itu RMMA PTA?"
# query = "How much the PTA system cost?"

# Encode query
q_vec = model.encode(query, normalize_embeddings=True)

# Compute cosine similarity against all stored embeddings
best = sorted(
    [(item["text"], float(np.dot(q_vec, item["embedding"]))) for item in kb],
    key=lambda x: x[1],
    reverse=True
)

print("🔍 Top 3 matches for:", query)
for text, score in best[:3]:
    print(f"  → {score:.3f} | {text[:100]}...")

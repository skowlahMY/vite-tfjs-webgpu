import numpy as np, json

# Assume you already have kb_with_embeddings.json
kb = json.load(open("multilingual_embeddings.json"))

embeddings = np.vstack([np.array(i["embedding"], dtype=np.float32) for i in kb])
embeddings.astype(np.float16).tofile("embeddings_fp16.bin")

with open("kb_meta.json", "w") as f:
    json.dump({"count": len(embeddings), "dim": embeddings.shape[1]}, f)

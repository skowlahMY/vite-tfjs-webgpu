from sentence_transformers import SentenceTransformer
import numpy as np

# ✅ Use the same multilingual model you used for creating multilingual_embeddings.json
model = SentenceTransformer("intfloat/multilingual-e5-small")

# Example pairs (English vs Malay)
pairs = [
    ("Our office hours are from 9 AM to 6 PM.", "Pejabat buka jam berapa?"),
    ("We develop IoT applications.", "Kami membangunkan aplikasi IoT."),
    ("Call 999 in case of emergency.", "Hubungi 999 jika berlaku kecemasan."),
    ("Our mission is to improve healthcare.", "Misi kami ialah memperbaiki perkhidmatan kesihatan.")
]

for text1, text2 in pairs:
    e1 = model.encode(text1, normalize_embeddings=True)
    e2 = model.encode(text2, normalize_embeddings=True)
    cos_sim = np.dot(e1, e2)
    print(f"🔍 {text1}\n💬 {text2}\n→ Cosine similarity: {cos_sim:.3f}\n")

'''
Interpreting the Scores
Cosine similarity	    Meaning
> 0.8	            Excellent — same meaning
0.6 - 0.8	        Good — related meaning
0.3 - 0.6	        Weak — loosely related
< 0.3	            Unrelated — different topics
'''
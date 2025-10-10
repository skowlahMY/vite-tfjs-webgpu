import re, json, textwrap

# === CONFIG ===
INPUT_FILE = "data.md"          # your input text or markdown file
OUTPUT_FILE = "chunks.json"     # output JSON for embedding
MAX_CHARS = 500                 # max chunk size before splitting (≈100–150 tokens)
MIN_CHARS = 80                  # min size before merging with next paragraph

# === HELPER ===
def clean_text(text):
    """Clean text by trimming and collapsing spaces."""
    return re.sub(r"\s+", " ", text.strip())

def split_markdown_sections(text):
    """
    Splits markdown content into sections based on headings.
    Supports #, ##, ### as hierarchical structure.
    """
    pattern = r"(?m)^(#{1,3})\s*(.+)$"
    sections = []
    current_section = {"title": None, "content": []}

    for line in text.splitlines():
        header_match = re.match(pattern, line)
        if header_match:
            if current_section["content"]:
                sections.append(current_section)
            current_section = {
                "title": header_match.group(2).strip(),
                "content": [],
            }
        else:
            if line.strip():
                current_section["content"].append(line.strip())

    if current_section["content"]:
        sections.append(current_section)

    return sections

def chunk_paragraphs(paragraphs, title):
    """Split or merge paragraphs into chunks of ~MAX_CHARS length."""
    chunks = []
    buffer = ""

    for para in paragraphs:
        if len(buffer) + len(para) < MAX_CHARS:
            buffer += " " + para
        else:
            chunks.append(clean_text(buffer))
            buffer = para

    if buffer:
        chunks.append(clean_text(buffer))

    # Merge short chunks with the next one if too small
    merged = []
    i = 0
    while i < len(chunks):
        if i < len(chunks) - 1 and len(chunks[i]) < MIN_CHARS:
            merged.append(chunks[i] + " " + chunks[i + 1])
            i += 2
        else:
            merged.append(chunks[i])
            i += 1

    return [{"title": title, "text": c} for c in merged]

# === MAIN ===
def main():
    text = open(INPUT_FILE, "r", encoding="utf-8").read()
    sections = split_markdown_sections(text)

    kb = []
    id_counter = 1

    for sec in sections:
        title = sec["title"] or "Untitled"
        paragraphs = sec["content"]
        for chunk in chunk_paragraphs(paragraphs, title):
            kb.append({
                "id": id_counter,
                "title": chunk["title"],
                "text": chunk["text"],
            })
            id_counter += 1

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(kb, f, indent=2, ensure_ascii=False)

    print(f"✅ Done! Created {len(kb)} chunks → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()

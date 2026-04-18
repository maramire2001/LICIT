def extract_text_from_bytes(file_bytes: bytes) -> str:
    try:
        import pymupdf  # type: ignore
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    except Exception:
        return ""

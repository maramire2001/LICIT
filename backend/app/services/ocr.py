import boto3
from app.core.config import settings

def get_textract_client():
    return boto3.client(
        "textract",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )

def extract_text_from_bytes(file_bytes: bytes) -> str:
    textract = get_textract_client()
    response = textract.detect_document_text(Document={"Bytes": file_bytes})
    blocks = response.get("Blocks", [])
    lines = [b["Text"] for b in blocks if b["BlockType"] == "LINE"]
    return "\n".join(lines)

"""Pure mapping helpers for YGOCDB Simplified Chinese card records."""

def map_translation(record):
    """Return (official_name, official_description, non_official_fallback_name)."""
    record = record or {}
    text = record.get("text") or {}
    name = text.get("sc_name") or ""
    description = text.get("desc") or ""
    pendulum = text.get("pdesc") or ""
    if pendulum:
        description = "〖灵摆效果〗\n" + pendulum + (
            "\n〖怪兽效果〗\n" if description else ""
        ) + description
    return name or None, description or None, record.get("cn_name") or None

def index_records_by_password(records):
    """Index YGOCDB CID-keyed records by their printed card password (id)."""
    return {
        str(record.get("id")): record
        for record in (records or {}).values()
        if isinstance(record, dict) and record.get("id") is not None
    }

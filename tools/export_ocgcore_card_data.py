#!/usr/bin/env python3
"""Convert a YGOPro/EDOPro cards.cdb datas table to OCGCore OcgCardData JSON.

The output is a runtime data index, not a display catalog. Race is emitted as
an integer because JSON has no BigInt; the browser adapter must convert it to
BigInt before returning OcgCardData to ocgcore-wasm.
"""
import argparse
import json
import sqlite3
from pathlib import Path

TYPE_LINK = 0x04000000
UINT32_MAX = 0xFFFFFFFF


def packed_setcodes(value):
    """Decode the CDB uint64 setcode into non-zero uint16 entries."""
    raw = int(value or 0)
    if raw < 0 or raw > 0xFFFFFFFFFFFFFFFF:
        raise ValueError(f"setcode outside uint64 range: {raw}")
    result = []
    for shift in range(0, 64, 16):
        part = (raw >> shift) & 0xFFFF
        if part:
            result.append(part)
    return result


def convert_row(row):
    code, alias, setcode, card_type, attack, defense, raw_level, race, attribute = row
    code = int(code)
    if not 0 < code <= UINT32_MAX:
        raise ValueError(f"invalid card passcode: {code}")
    card_type = int(card_type or 0)
    raw_level = int(raw_level or 0)
    raw_defense = int(defense or 0)
    is_link = bool(card_type & TYPE_LINK)

    # CDB level layout: low byte = level/rank/link rating;
    # bits 16-23 = right scale; bits 24-31 = left scale.
    # For Link monsters, CDB def stores link markers, not defense.
    return {
        "code": code,
        "alias": int(alias or 0),
        "setcodes": packed_setcodes(setcode),
        "type": card_type,
        "level": raw_level & 0xFF,
        "attribute": int(attribute or 0),
        "race": int(race or 0),
        "attack": int(attack or 0),
        "defense": 0 if is_link else raw_defense,
        "lscale": (raw_level >> 24) & 0xFF,
        "rscale": (raw_level >> 16) & 0xFF,
        "link_marker": raw_defense if is_link else 0,
    }


def export_database(source: Path, destination: Path):
    uri = source.resolve().as_uri() + "?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    try:
        rows = conn.execute("""
            SELECT id, alias, setcode, type, atk, def, level, race, attribute
            FROM datas
            ORDER BY id
        """)
        cards = {}
        for row in rows:
            item = convert_row(row)
            key = str(item["code"])
            if key in cards:
                raise ValueError(f"duplicate card passcode: {key}")
            cards[key] = item
    finally:
        conn.close()

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps({
            "format": "duellab-ocgcore-card-data-v1",
            "source_file": source.name,
            "count": len(cards),
            "cards": cards,
        }, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return len(cards)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path, help="Path to cards.cdb")
    parser.add_argument("--output", required=True, type=Path, help="Output runtime JSON")
    args = parser.parse_args()
    count = export_database(args.input, args.output)
    print(f"Exported {count} OCGCore card records to {args.output}")


if __name__ == "__main__":
    main()

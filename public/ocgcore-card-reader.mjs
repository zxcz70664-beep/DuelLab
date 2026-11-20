/**
 * Browser adapter for the OcgCardData JSON generated from cards.cdb.
 * JSON cannot represent BigInt, so race is converted at the boundary.
 */
const FORMAT = "duellab-ocgcore-card-data-v1";

export function createCardReaderFromData(payload) {
  if (!payload || payload.format !== FORMAT || !payload.cards || typeof payload.cards !== "object") {
    throw new TypeError("Invalid OCGCore card data document.");
  }
  const cards = payload.cards;

  return function cardReader(passcode) {
    const code = Number(passcode);
    if (!Number.isSafeInteger(code) || code <= 0) return null;
    const raw = cards[String(code)];
    if (!raw) return null;
    if (raw.code !== code) {
      throw new Error("OCGCore card record key/code mismatch for " + code);
    }
    if (!Number.isSafeInteger(raw.race) || raw.race < 0) {
      throw new TypeError("Invalid race bitmask for card " + code);
    }
    const numericFields = [
      "alias", "type", "level", "attribute", "attack", "defense",
      "lscale", "rscale", "link_marker"
    ];
    for (const field of numericFields) {
      if (!Number.isSafeInteger(raw[field])) {
        throw new TypeError("Invalid " + field + " field for card " + code);
      }
    }
    if (!Array.isArray(raw.setcodes) ||
        !raw.setcodes.every(value => Number.isInteger(value) && value > 0 && value <= 0xFFFF)) {
      throw new TypeError("Invalid setcodes for card " + code);
    }
    return {
      code: raw.code,
      alias: raw.alias,
      setcodes: [...raw.setcodes],
      type: raw.type,
      level: raw.level,
      attribute: raw.attribute,
      race: BigInt(raw.race),
      attack: raw.attack,
      defense: raw.defense,
      lscale: raw.lscale,
      rscale: raw.rscale,
      link_marker: raw.link_marker
    };
  };
}

export async function loadOcgCoreCardReader(url = "/ocgcore-cards.json", fetchImpl = fetch) {
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load OCGCore card data: HTTP " + response.status);
  }
  const payload = await response.json();
  return createCardReaderFromData(payload);
}

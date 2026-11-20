import test from "node:test";
import assert from "node:assert/strict";
import { createCardReaderFromData, loadOcgCoreCardReader } from "../public/ocgcore-card-reader.mjs";

const payload = {
  format: "duellab-ocgcore-card-data-v1",
  count: 1,
  cards: {
    "46986414": {
      code: 46986414, alias: 0, setcodes: [0x1234], type: 0x11,
      level: 7, attribute: 32, race: 2, attack: 2500, defense: 2100,
      lscale: 0, rscale: 0, link_marker: 0
    }
  }
};

test("cardReader returns OcgCardData and converts race to BigInt", () => {
  const read = createCardReaderFromData(payload);
  const card = read(46986414);
  assert.equal(card.code, 46986414);
  assert.equal(card.race, 2n);
  assert.deepEqual(card.setcodes, [0x1234]);
  assert.equal(read(123), null);
});

test("cardReader rejects invalid passcodes and malformed race", () => {
  const read = createCardReaderFromData(payload);
  assert.equal(read(0), null);
  assert.equal(read("not-a-code"), null);
  const broken = structuredClone(payload);
  broken.cards["46986414"].race = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => createCardReaderFromData(broken)(46986414), /race/);
});

test("loader fetches and validates the JSON document", async () => {
  const read = await loadOcgCoreCardReader("/fixture.json", async url => ({
    ok: true,
    json: async () => payload
  }));
  assert.equal(read(46986414).race, 2n);
});

test("loader reports HTTP errors", async () => {
  await assert.rejects(
    loadOcgCoreCardReader("/missing.json", async () => ({ ok: false, status: 404 })),
    /HTTP 404/
  );
});

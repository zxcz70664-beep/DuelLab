import { createCardReaderFromData } from "./ocgcore-card-reader.mjs";

const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const logEl = document.getElementById("log");
const log = message => { logEl.textContent += "\n" + message; };

document.getElementById("run").addEventListener("click", async () => {
  const button = document.getElementById("run");
  button.disabled = true;
  statusEl.className = "status";
  statusEl.textContent = "验证执行中…";
  summaryEl.textContent = "正在下载并检查 Runtime 卡片数据。";
  logEl.textContent = "Starting OCGCore runtime card data check.";
  try {
    const response = await fetch("/ocgcore-cards.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Runtime JSON 请求失败：HTTP " + response.status);
    const payload = await response.json();
    if (payload.format !== "duellab-ocgcore-card-data-v1") {
      throw new Error("数据格式不匹配：" + payload.format);
    }
    const entries = Object.entries(payload.cards || {});
    if (entries.length !== payload.count) {
      throw new Error("count 不匹配：声明 " + payload.count + "，实际 " + entries.length);
    }
    log("JSON loaded: " + entries.length + " records.");
    log("Declared count matches actual record count.");

    const reader = createCardReaderFromData(payload);
    const samples = [46986414, 89631139];
    let sampleCount = 0;
    for (const code of samples) {
      const card = reader(code);
      if (!card) {
        log("Sample passcode " + code + " is not present in this database snapshot.");
        continue;
      }
      if (typeof card.race !== "bigint") throw new Error("Card " + code + " race is not BigInt.");
      sampleCount++;
      log("Card " + code + ": type=" + card.type +
          ", level=" + card.level + ", race=" + card.race.toString() +
          ", ATK=" + card.attack + ", DEF=" + card.defense +
          ", setcodes=" + JSON.stringify(card.setcodes));
    }
    if (!sampleCount) throw new Error("样例卡片均未找到，无法完成真实记录读取验证。");

    const missing = reader(999999999);
    if (missing !== null) throw new Error("未知密码应返回 null。");
    log("Unknown passcode returns null.");
    log("PASS: data file, record count, card lookup, BigInt conversion and missing-card behavior.");
    statusEl.className = "status ok";
    statusEl.textContent = "通过";
    summaryEl.textContent = "Runtime 卡片 JSON 已成功加载，共 " + entries.length +
      " 条记录；样例卡片读取成功，race 已转换为 BigInt，未知密码返回 null。";
  } catch (error) {
    statusEl.className = "status fail";
    statusEl.textContent = "失败：" + (error?.message || error);
    summaryEl.textContent = "验证未通过，请将下方完整日志发给我。";
    log("FAIL: " + (error?.stack || error));
  } finally {
    button.disabled = false;
  }
});

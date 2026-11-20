const $ = (id) => document.getElementById(id);
const log = (message) => {
  const el = $("log");
  el.textContent += "\n" + new Date().toLocaleTimeString() + "  " + message;
  el.scrollTop = el.scrollHeight;
};
const setStep = (id, state, message) => {
  const el = $(id);
  el.className = "status " + state;
  el.querySelector("span").textContent = message;
};
const reset = () => {
  for (const id of ["step1", "step2", "step3", "step4"]) setStep(id, "", "等待验证");
  $("summary").textContent = "验证执行中…";
  $("log").textContent = "DuelLab OCGCore browser check started.";
};
$("run").addEventListener("click", async () => {
  $("run").disabled = true;
  reset();
  let stage = "step1";
  try {
    if (typeof WebAssembly !== "object" || typeof WebAssembly.instantiate !== "function") throw new Error("当前浏览器不支持 WebAssembly。");
    setStep("step1", "ok", "支持 WebAssembly");
    log("Browser: " + navigator.userAgent);

    stage = "step2";
    setStep(stage, "running", "正在加载 OCGCore 0.1.6 发布包 dist/index.js…");
    // The JSR root mod.ts re-exports symbols but omits the default initializer.
    // The actual createCore initializer is the default export of published dist/index.js.
    const moduleUrl = "https://esm.sh/jsr/@n1xx1/ocgcore-wasm@0.1.6/dist/index.js?bundle";
    log("Import URL: " + moduleUrl);
    const coreModule = await import(moduleUrl);
    const exportNames = Object.keys(coreModule);
    log("Module import succeeded. Exports: " + exportNames.join(", "));
    const createCore = coreModule.default;
    if (typeof createCore !== "function") throw new Error("dist/index.js 已加载，但 default 导出不是函数。Exports: " + exportNames.join(", "));
    setStep(stage, "ok", "模块加载成功，已找到默认初始化函数");

    stage = "step3";
    setStep(stage, "running", "正在初始化 WASM（sync 模式）…");
    let core;
    try { core = await createCore({ sync: true }); }
    catch (error) { throw new Error("WASM 初始化失败：" + (error?.stack || error)); }
    if (!core) throw new Error("WASM 初始化失败：初始化函数没有返回核心对象。");
    setStep(stage, "ok", "WASM 初始化成功");
    log("WASM initialization completed.");

    stage = "step4";
    setStep(stage, "running", "正在读取核心版本…");
    if (typeof core.getVersion !== "function") throw new Error("核心版本读取失败：核心对象没有 getVersion() 方法。");
    let version;
    try { version = core.getVersion(); }
    catch (error) { throw new Error("核心版本读取失败：" + (error?.stack || error)); }
    if (!Array.isArray(version) || version.length < 2 || !version.every(Number.isFinite)) throw new Error("核心版本读取失败：getVersion() 返回格式异常：" + JSON.stringify(version));
    setStep(stage, "ok", "OCGCore " + version[0] + "." + version[1]);
    $("summary").textContent = "全部通过：模块加载、WASM 初始化和核心版本读取均成功。下一步进入最小 Duel 创建验证。";
    log("Core version: " + version.join("."));
    log("PASS: module load, WASM initialization, and version read.");
  } catch (error) {
    log("FAIL at " + stage + ": " + (error?.stack || String(error)));
    setStep(stage, "fail", String(error?.message || error));
    const labels = {step2:"模块加载失败",step3:"WASM 初始化失败",step4:"核心版本读取失败"};
    $("summary").textContent = labels[stage] + "。请展开诊断日志查看具体原因。";
  } finally { $("run").disabled = false; }
});

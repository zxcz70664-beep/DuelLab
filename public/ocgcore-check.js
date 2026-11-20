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
  for (const id of ["step1","step2","step3","step4"]) setStep(id,"","等待验证");
  $("summary").textContent = "验证执行中…";
  $("log").textContent = "DuelLab OCGCore browser check started.";
};
$("run").addEventListener("click", async () => {
  $("run").disabled = true;
  reset();
  try {
    const supported = typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
    if (!supported) throw new Error("当前浏览器不支持 WebAssembly。");
    setStep("step1","ok","支持 WebAssembly");
    log("Browser: " + navigator.userAgent);
    log("WebAssembly detected.");

    setStep("step2","running","正在加载 JSR 0.1.6 的底层 dist/index.js…");
    const moduleUrl = "https://esm.sh/jsr/@n1xx1/ocgcore-wasm@0.1.6/dist/index.js?bundle";
    const coreModule = await import(moduleUrl);
    log("Module imported: " + moduleUrl);
    log("Exports: " + Object.keys(coreModule).join(", "));
    const createCore = coreModule.default;
    if (typeof createCore !== "function") {
      throw new Error("底层模块仍未暴露默认初始化函数。实际导出：" + Object.keys(coreModule).join(", "));
    }
    setStep("step2","ok","模块加载成功（找到默认导出）");

    setStep("step3","running","正在初始化 WASM…");
    const core = await createCore({sync:true});
    if (!core || typeof core.getVersion !== "function") {
      throw new Error("WASM 初始化未返回预期的核心接口。");
    }
    setStep("step3","ok","WASM 初始化成功");
    log("createCore({sync:true}) completed.");

    setStep("step4","running","正在读取版本…");
    const version = core.getVersion();
    if (!Array.isArray(version) || version.length < 2) {
      throw new Error("核心已初始化，但 getVersion() 返回值异常：" + JSON.stringify(version));
    }
    setStep("step4","ok","OCGCore " + version[0] + "." + version[1]);
    $("summary").textContent = "通过：当前浏览器成功加载 OCGCore WASM，并读取到核心版本 " + version[0] + "." + version[1] + "。下一步才是创建测试 Duel。";
    log("Core version: " + version.join("."));
    log("PASS: browser WASM initialization verified.");
  } catch (error) {
    const message = error && error.stack ? error.stack : String(error);
    log("FAIL: " + message);
    const failed = ["step2","step3","step4"].find(id => !$(id).classList.contains("ok"));
    if (failed) setStep(failed,"fail",String(error.message || error));
    $("summary").textContent = "未通过：请把完整诊断日志发给我，我会根据失败步骤修复。";
  } finally {
    $("run").disabled = false;
  }
});

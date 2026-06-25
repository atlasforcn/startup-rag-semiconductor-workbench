const modules = [
  {
    id: "process",
    name: "製程紀錄",
    description: "批次參數、站點紀錄、異常註記",
    quality: 92,
    records: "18.4k",
    freshness: "18 分鐘",
    enabled: true,
  },
  {
    id: "equipment",
    name: "設備警示",
    description: "機台事件、維修紀錄、告警時間線",
    quality: 87,
    records: "9.2k",
    freshness: "6 分鐘",
    enabled: true,
  },
  {
    id: "yield",
    name: "良率資料",
    description: "批次良率、缺陷分類、趨勢比較",
    quality: 90,
    records: "4.8k",
    freshness: "1 小時",
    enabled: true,
  },
  {
    id: "sop",
    name: "SOP 文件",
    description: "標準作業、排查步驟、責任分工",
    quality: 82,
    records: "326",
    freshness: "2 天",
    enabled: false,
  },
];

const tests = [
  { id: "citation", title: "引用完整性", score: 88, note: "答案需要列出來源模組、文件版本與時間戳。" },
  { id: "conflict", title: "衝突文件辨識", score: 76, note: "遇到版本矛盾時必須停止下結論並要求複核。" },
  { id: "attribution", title: "異常歸因", score: 81, note: "比對設備警示與良率變化的時間差，不把相關性當因果。" },
  { id: "action", title: "回覆可操作性", score: 93, note: "輸出工程師可執行、可回復且有責任人的排查步驟。" },
];

const auditEntries = [
  { time: "08:42", title: "驗證集完成", detail: "36 筆案例；衝突文件辨識低於上線門檻。" },
  { time: "08:26", title: "知識版本同步", detail: "FAB-KB 24.06；製程與設備模組更新。" },
  { time: "昨天", title: "人工退回上線申請", detail: "缺少 SOP 模組與資料版本差異說明。" },
];

const moduleList = document.querySelector("#moduleList");
const testList = document.querySelector("#testList");
const answer = document.querySelector("#answer");
const healthScore = document.querySelector("#healthScore");
const runQuery = document.querySelector("#runQuery");
const runEvaluation = document.querySelector("#runEvaluation");
const query = document.querySelector("#query");
const riskMode = document.querySelector("#riskMode");
const requestRelease = document.querySelector("#requestRelease");
const auditLog = document.querySelector("#auditLog");
const toast = document.querySelector("#toast");

let evaluationRun = 0;
let queryRun = 0;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function activeModules() {
  return modules.filter((module) => module.enabled);
}

function averageTestScore() {
  return Math.round(tests.reduce((sum, test) => sum + test.score, 0) / tests.length);
}

function releaseChecks() {
  return [
    {
      label: "SOP 與責任分工模組已啟用",
      passed: modules.find((module) => module.id === "sop").enabled,
    },
    {
      label: "回答模式設為嚴格引用",
      passed: riskMode.value === "strict",
    },
    {
      label: "驗證集平均分至少 88",
      passed: averageTestScore() >= 88,
    },
    {
      label: "衝突文件辨識至少 85",
      passed: tests.find((test) => test.id === "conflict").score >= 85,
    },
  ];
}

function updateHealth() {
  const active = activeModules();
  const avg = active.reduce((sum, module) => sum + module.quality, 0) / Math.max(active.length, 1);
  const coverage = active.length / modules.length;
  const evalFactor = averageTestScore();
  const score = Math.round(avg * 0.52 + coverage * 20 + evalFactor * 0.28);
  healthScore.textContent = score;
  document.querySelector("#citationCoverage").textContent =
    `${Math.min(98, 72 + active.length * 4 + (riskMode.value === "strict" ? 6 : 0))}%`;
  renderReleaseGate();
}

function renderModules() {
  moduleList.innerHTML = modules.map((module) => `
    <article class="module ${module.enabled ? "enabled" : ""}">
      <label>
        <span>
          <strong>${module.name}</strong>
          <small>${module.records} 筆 · 更新 ${module.freshness}前</small>
        </span>
        <input type="checkbox" data-id="${module.id}" ${module.enabled ? "checked" : ""}>
      </label>
      <p>${module.description}</p>
      <div class="meter" aria-label="${module.name}品質 ${module.quality} 分"><span style="width: ${module.quality}%"></span></div>
    </article>
  `).join("");

  moduleList.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const module = modules.find((item) => item.id === input.dataset.id);
      module.enabled = input.checked;
      renderModules();
      updateHealth();
      addAudit(
        `${module.name}${module.enabled ? "已啟用" : "已停用"}`,
        "知識模組變更已寫入測試工作區，尚未影響正式環境。",
      );
    });
  });
}

function renderTests() {
  testList.innerHTML = tests.map((test) => `
    <article class="test">
      <div class="test-top">
        <strong>${test.title}</strong>
        <b class="${test.score >= 88 ? "pass" : test.score >= 80 ? "warn" : "fail"}">${test.score}</b>
      </div>
      <div class="meter"><span style="width: ${test.score}%"></span></div>
      <p>${test.note}</p>
    </article>
  `).join("");

  const average = averageTestScore();
  document.querySelector("#evaluationAverage").textContent = average;
  document.querySelector("#evaluationStatus").textContent =
    average >= 88
      ? "整體達標，仍需通過全部部署條件"
      : "需補 SOP 模組、嚴格引用與反例測試";
  updateHealth();
}

function evidenceRows() {
  const active = activeModules();
  const rows = [
    {
      source: "設備警示 / ETCH-07",
      version: "2026-06-24 08:11",
      evidence: "壓力偏移警示早於缺陷率上升 17 分鐘",
      active: active.some((module) => module.id === "equipment"),
    },
    {
      source: "製程紀錄 / LOT-A93",
      version: "recipe v18.2",
      evidence: "氣體流量在允收區間上緣，需與前批比較",
      active: active.some((module) => module.id === "process"),
    },
    {
      source: "良率資料 / MAP-441",
      version: "2026-W25",
      evidence: "邊緣缺陷由 1.8% 升至 3.6%",
      active: active.some((module) => module.id === "yield"),
    },
    {
      source: "SOP / EXC-12",
      version: "rev. 7",
      evidence: "先確認腔體壓力校正，再決定是否停機",
      active: active.some((module) => module.id === "sop"),
    },
  ];
  return rows.filter((row) => row.active);
}

function renderAnswer() {
  const active = activeModules();
  const modeText = riskMode.options[riskMode.selectedIndex].textContent;
  const safeQuery = escapeHtml(query.value.trim() || "未輸入問題");
  const evidence = evidenceRows();
  const hasSop = active.some((module) => module.id === "sop");
  const strict = riskMode.value === "strict";
  const confidence = Math.min(94, 58 + active.length * 7 + (strict ? 8 : 0));
  const limitation = !hasSop
    ? "SOP 模組尚未啟用，系統不能產生正式排查順序。"
    : "證據顯示壓力偏移與缺陷率上升有時間關聯，但不足以單獨證明根因。";

  answer.innerHTML = `
    <div class="answer-head">
      <div>
        <span>${modeText} · 第 ${queryRun + 1} 次測試</span>
        <strong>證據信心 ${confidence}%</strong>
      </div>
      <span class="review-badge">需要工程師複核</span>
    </div>
    <p class="query-copy"><b>問題</b>${safeQuery}</p>
    <div class="answer-summary">
      <b>初步判讀</b>
      <p>目前證據優先指向 ETCH-07 的壓力偏移與 LOT-A93 邊緣缺陷增加。建議先確認感測器校正、前後批 recipe 差異與維修時間線，不應直接修改製程參數。</p>
    </div>
    <div class="citation-table">
      ${evidence.map((row, index) => `
        <article>
          <span>[${index + 1}] ${row.source}</span>
          <strong>${row.evidence}</strong>
          <small>${row.version}</small>
        </article>
      `).join("") || "<p>尚未啟用可引用模組。</p>"}
    </div>
    <div class="limitation">
      <b>限制與下一步</b>
      <span>${limitation}</span>
    </div>
  `;
}

function renderReleaseGate() {
  const checks = releaseChecks();
  const passed = checks.every((check) => check.passed);
  document.querySelector("#releaseChecklist").innerHTML = checks.map((check) => `
    <div class="${check.passed ? "passed" : ""}">
      <span aria-hidden="true">${check.passed ? "✓" : "×"}</span>
      <strong>${check.label}</strong>
    </div>
  `).join("");
  requestRelease.disabled = !passed;
  document.querySelector("#releaseState").textContent =
    passed ? "可建立人工上線審查" : `尚缺 ${checks.filter((check) => !check.passed).length} 項門檻`;
}

function renderAudit() {
  auditLog.innerHTML = auditEntries.map((entry) => `
    <li>
      <span>${entry.time}</span>
      <div><strong>${entry.title}</strong><p>${entry.detail}</p></div>
    </li>
  `).join("");
}

function addAudit(title, detail) {
  const time = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  auditEntries.unshift({ time, title, detail });
  auditEntries.splice(6);
  renderAudit();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function runQueryTest() {
  runQuery.disabled = true;
  runQuery.textContent = "檢索與比對中…";
  window.setTimeout(() => {
    queryRun += 1;
    renderAnswer();
    addAudit(
      "完成 RAG 問答測試",
      `${activeModules().length} 個模組、${riskMode.options[riskMode.selectedIndex].textContent}；結果等待工程師複核。`,
    );
    runQuery.disabled = false;
    runQuery.textContent = "執行 RAG 測試";
    showToast("問答測試完成；已保留引用與限制說明。");
  }, 520);
}

function rerunEvaluation() {
  runEvaluation.disabled = true;
  runEvaluation.textContent = "驗證 36 筆案例中…";
  window.setTimeout(() => {
    evaluationRun += 1;
    const activeCount = activeModules().length;
    const strictBonus = riskMode.value === "strict" ? 5 : 0;
    const sopBonus = modules.find((module) => module.id === "sop").enabled ? 7 : 0;
    tests.forEach((test, index) => {
      const baseBoost = Math.min(4, evaluationRun * 2);
      const conflictBonus = test.id === "conflict" ? sopBonus + strictBonus : Math.round((sopBonus + strictBonus) / 2);
      test.score = Math.min(97, test.score + baseBoost + conflictBonus + Math.max(0, activeCount - 3));
    });
    document.querySelector("#evaluationCases").textContent = "36 cases";
    renderTests();
    addAudit(
      "重跑 36 筆驗證集",
      `平均 ${averageTestScore()} 分；包含反例、衝突版本與無答案案例。`,
    );
    runEvaluation.disabled = false;
    runEvaluation.textContent = "重跑 36 筆驗證集";
    showToast("驗證完成；部署門檻已重新計算。");
  }, 680);
}

function requestHumanRelease() {
  addAudit(
    "建立人工上線審查",
    "提交知識版本、驗證結果、資料差異與回復方案；未自動部署。",
  );
  requestRelease.disabled = true;
  requestRelease.textContent = "審查任務已建立";
  showToast("已建立人工審查任務，尚未部署到正式環境。");
}

runQuery.addEventListener("click", runQueryTest);
runEvaluation.addEventListener("click", rerunEvaluation);
riskMode.addEventListener("change", () => {
  renderAnswer();
  updateHealth();
});
requestRelease.addEventListener("click", requestHumanRelease);

renderModules();
renderTests();
renderAnswer();
renderAudit();

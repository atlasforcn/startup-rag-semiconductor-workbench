const modules = [
  { id: "process", name: "製程紀錄", description: "批次參數、站點紀錄、異常註記", quality: 92, enabled: true },
  { id: "equipment", name: "設備警示", description: "機台事件、維修紀錄、告警時間線", quality: 87, enabled: true },
  { id: "yield", name: "良率資料", description: "批次良率、缺陷分類、趨勢比較", quality: 90, enabled: true },
  { id: "sop", name: "SOP 文件", description: "標準作業、排查步驟、責任分工", quality: 82, enabled: false },
];

const tests = [
  { title: "引用完整性", score: 88, note: "答案需要列出來源模組與時間戳。" },
  { title: "異常歸因", score: 81, note: "比對設備警示與良率變化的時間差。" },
  { title: "回覆可操作性", score: 93, note: "輸出工程師可執行的排查步驟。" },
];

const moduleList = document.querySelector("#moduleList");
const testList = document.querySelector("#testList");
const answer = document.querySelector("#answer");
const healthScore = document.querySelector("#healthScore");
const runQuery = document.querySelector("#runQuery");
const query = document.querySelector("#query");
const riskMode = document.querySelector("#riskMode");

function activeModules() {
  return modules.filter((module) => module.enabled);
}

function updateHealth() {
  const active = activeModules();
  const avg = active.reduce((sum, module) => sum + module.quality, 0) / Math.max(active.length, 1);
  const coverage = active.length / modules.length;
  healthScore.textContent = Math.round(avg * 0.78 + coverage * 22);
}

function renderModules() {
  moduleList.innerHTML = modules.map((module) => `
    <article class="module">
      <label>
        ${module.name}
        <input type="checkbox" data-id="${module.id}" ${module.enabled ? "checked" : ""}>
      </label>
      <p>${module.description}</p>
      <div class="meter"><span style="width: ${module.quality}%"></span></div>
    </article>
  `).join("");

  moduleList.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const module = modules.find((item) => item.id === input.dataset.id);
      module.enabled = input.checked;
      updateHealth();
    });
  });
}

function renderTests() {
  testList.innerHTML = tests.map((test) => `
    <article class="test">
      <strong>${test.title}</strong>
      <div class="meter"><span style="width: ${test.score}%"></span></div>
      <p>${test.note}</p>
    </article>
  `).join("");
}

function renderAnswer() {
  const active = activeModules();
  const modeText = riskMode.options[riskMode.selectedIndex].textContent;
  const moduleNames = active.map((module) => module.name).join("、") || "未啟用模組";
  answer.innerHTML = `
    <strong>${modeText} / 已串接 ${active.length} 個模組</strong>
    <p>問題：${query.value}</p>
    <p>初步答案會先查詢 ${moduleNames}，找出良率下降前後的共同異常，再用 SOP 文件產生排查順序。</p>
    <p>建議輸出：1. 風險批次清單。2. 關聯設備警示。3. 製程參數偏移。4. 需要工程師確認的下一步。</p>
  `;
}

runQuery.addEventListener("click", renderAnswer);
riskMode.addEventListener("change", renderAnswer);

renderModules();
renderTests();
updateHealth();
renderAnswer();

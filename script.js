const state = {
  rows: [],
  filtered: [],
  grade: null,
};

const form = document.querySelector("#searchForm");
const gradeInput = document.querySelector("#gradeInput");
const roundFilter = document.querySelector("#roundFilter");
const trackFilter = document.querySelector("#trackFilter");
const regionFilter = document.querySelector("#regionFilter");
const keywordInput = document.querySelector("#keywordInput");
const reachFilter = document.querySelector("#reachFilter");
const sortFilter = document.querySelector("#sortFilter");
const resultCount = document.querySelector("#resultCount");
const dataCount = document.querySelector("#dataCount");
const emptyState = document.querySelector("#emptyState");
const results = document.querySelector("#results");

const formatGrade = (value) => (Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, "") : "-");
const formatCount = (value) => (Number.isFinite(value) ? `${value.toLocaleString("ko-KR")}명` : "-");

function judge(row, grade, reach) {
  if (!Number.isFinite(grade)) return null;
  if (Number.isFinite(row.avgGrade) && grade <= row.avgGrade) {
    return { key: "safe", label: "안정권", rank: 0 };
  }
  if (Number.isFinite(row.cutoffGrade) && grade <= row.cutoffGrade) {
    return { key: "match", label: "적정권", rank: 1 };
  }
  if (Number.isFinite(row.cutoffGrade) && grade <= row.cutoffGrade + reach) {
    return { key: "reach", label: "상향권", rank: 2 };
  }
  if (!Number.isFinite(row.cutoffGrade) && Number.isFinite(row.avgGrade) && grade <= row.avgGrade + reach) {
    return { key: "reference", label: "참고권", rank: 3 };
  }
  return null;
}

function populateRegions(rows) {
  const regions = [...new Set(rows.map((row) => row.region).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ko-KR")
  );
  regionFilter.insertAdjacentHTML(
    "beforeend",
    regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join("")
  );
}

function applyFilters() {
  const grade = Number.parseFloat(gradeInput.value);
  const reach = Number.parseFloat(reachFilter.value);
  const round = roundFilter.value;
  const track = trackFilter.value;
  const region = regionFilter.value;
  const keyword = keywordInput.value.trim().toLowerCase();

  state.grade = Number.isFinite(grade) ? grade : null;
  if (!Number.isFinite(grade) || grade < 1 || grade > 9) {
    state.filtered = [];
    render();
    return;
  }

  state.filtered = state.rows
    .map((row) => ({ ...row, judgement: judge(row, grade, reach) }))
    .filter((row) => row.judgement)
    .filter((row) => !round || row.round === round)
    .filter((row) => !track || row.track === track)
    .filter((row) => !region || row.region === region)
    .filter((row) => {
      if (!keyword) return true;
      return `${row.college} ${row.major}`.toLowerCase().includes(keyword);
    });

  sortRows();
  render();
}

function sortRows() {
  const mode = sortFilter.value;
  state.filtered.sort((a, b) => {
    if (mode === "college") {
      return `${a.college}${a.major}`.localeCompare(`${b.college}${b.major}`, "ko-KR");
    }
    if (mode === "cutoff") {
      return (b.cutoffGrade ?? 0) - (a.cutoffGrade ?? 0);
    }
    return (
      a.judgement.rank - b.judgement.rank ||
      Math.abs((a.avgGrade ?? a.cutoffGrade ?? 9) - state.grade) -
        Math.abs((b.avgGrade ?? b.cutoffGrade ?? 9) - state.grade) ||
      `${a.college}${a.major}`.localeCompare(`${b.college}${b.major}`, "ko-KR")
    );
  });
}

function render() {
  resultCount.textContent = `${state.filtered.length.toLocaleString("ko-KR")}개`;
  results.innerHTML = "";

  if (!state.filtered.length) {
    emptyState.classList.remove("hidden");
    emptyState.textContent = state.grade
      ? "조건에 맞는 결과가 없습니다. 전형, 지역, 상향 허용폭을 넓혀 다시 검색해 보세요."
      : "내신 등급을 입력하면 지원 가능 대학과 학과가 표시됩니다.";
    return;
  }

  emptyState.classList.add("hidden");
  const visibleRows = state.filtered.slice(0, 120);
  results.innerHTML = visibleRows.map(renderRow).join("");

  if (state.filtered.length > visibleRows.length) {
    results.insertAdjacentHTML(
      "beforeend",
      `<div class="empty-state">상위 ${visibleRows.length}개만 표시 중입니다. 필터를 추가하면 더 좁혀볼 수 있습니다.</div>`
    );
  }
}

function renderRow(row) {
  const method = row.scoreMethod2026 || "산출방법 확인 필요";
  return `
    <article class="result-row">
      <div class="college">
        <span class="region">${escapeHtml(row.region)}</span>
        <strong>${escapeHtml(row.college)}</strong>
        <span class="major">${escapeHtml(row.major)}</span>
      </div>
      <div class="tag-line">
        <span class="tag">${escapeHtml(row.round)}</span>
        <span class="tag">${escapeHtml(row.track)}</span>
        <span class="tag">${escapeHtml(String(row.years).replace(/\.0$/, ""))}년제</span>
      </div>
      <span class="badge ${row.judgement.key}">${row.judgement.label}</span>
      <div class="numbers">
        <span>평균 <strong>${formatGrade(row.avgGrade)}</strong></span>
        <span>최저 <strong>${formatGrade(row.cutoffGrade)}</strong></span>
        <span>모집 <strong>${formatCount(row.quota)}</strong> · 충원 <strong>${formatCount(row.waitlist)}</strong></span>
      </div>
      <p class="method">${escapeHtml(method)}</p>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function boot() {
  try {
    const response = await fetch("data/admissions.json");
    if (!response.ok) throw new Error("데이터를 불러오지 못했습니다.");
    state.rows = await response.json();
    dataCount.textContent = `${state.rows.length.toLocaleString("ko-KR")}건`;
    populateRegions(state.rows);
  } catch (error) {
    emptyState.textContent = "입결 데이터를 불러오지 못했습니다. 로컬 서버에서 실행해 주세요.";
    dataCount.textContent = "오류";
    console.error(error);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  applyFilters();
});

[roundFilter, trackFilter, regionFilter, keywordInput, reachFilter].forEach((element) => {
  element.addEventListener("input", () => {
    if (gradeInput.value) applyFilters();
  });
});

sortFilter.addEventListener("input", () => {
  sortRows();
  render();
});

gradeInput.addEventListener("input", () => {
  if (gradeInput.value) applyFilters();
});

boot();

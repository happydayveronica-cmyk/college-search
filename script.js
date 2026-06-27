const SEMESTERS = [
  { id: "s11", label: "1학년 1학기" },
  { id: "s12", label: "1학년 2학기" },
  { id: "s21", label: "2학년 1학기" },
  { id: "s22", label: "2학년 2학기" },
  { id: "s31", label: "3학년 1학기" },
];

const DEFAULT_SUBJECTS = 5;

const state = {
  rows: [],
  filtered: [],
  grade: null,
  semesterAverages: {},
};

const gradeTabButton = document.querySelector("#gradeTabButton");
const searchTabButton = document.querySelector("#searchTabButton");
const gradeTab = document.querySelector("#gradeTab");
const searchTab = document.querySelector("#searchTab");
const searchOutput = document.querySelector("#searchOutput");
const semesterContainer = document.querySelector("#semesterContainer");
const averageGrade = document.querySelector("#averageGrade");
const bestSemester = document.querySelector("#bestSemester");
const semesterCount = document.querySelector("#semesterCount");
const goSearchButton = document.querySelector("#goSearchButton");
const searchForm = document.querySelector("#searchForm");
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

function switchTab(target) {
  const isGradeTab = target === "grade";
  gradeTabButton.classList.toggle("active", isGradeTab);
  searchTabButton.classList.toggle("active", !isGradeTab);
  gradeTabButton.setAttribute("aria-selected", String(isGradeTab));
  searchTabButton.setAttribute("aria-selected", String(!isGradeTab));
  gradeTab.classList.toggle("active", isGradeTab);
  searchTab.classList.toggle("active", !isGradeTab);
  gradeTab.hidden = !isGradeTab;
  searchTab.hidden = isGradeTab;
  searchOutput.hidden = isGradeTab;
}

function buildSemesterInputs() {
  semesterContainer.innerHTML = SEMESTERS.map(renderSemesterBlock).join("");
  SEMESTERS.forEach((semester) => {
    const block = getSemesterBlock(semester.id);
    block.querySelector(".add-subject").addEventListener("click", () => addSubject(semester.id));
    block.querySelector(".remove-subject").addEventListener("click", () => removeSubject(semester.id));
    for (let index = 0; index < DEFAULT_SUBJECTS; index += 1) {
      appendSubjectPair(semester.id);
    }
  });
  updateGrades();
}

function renderSemesterBlock(semester) {
  return `
    <section class="semester-block" data-semester="${semester.id}">
      <div class="semester-head">
        <div class="semester-title">
          <h2>${semester.label}</h2>
          <input class="semester-average" type="text" value="-" aria-label="${semester.label} 평균등급" readonly />
        </div>
        <div class="semester-actions">
          <button class="add-subject" type="button">과목추가 +</button>
          <button class="remove-subject" type="button">과목삭제 -</button>
        </div>
      </div>
      <div class="subject-grid"></div>
    </section>
  `;
}

function getSemesterBlock(semesterId) {
  return semesterContainer.querySelector(`[data-semester="${semesterId}"]`);
}

function addSubject(semesterId) {
  appendSubjectPair(semesterId);
  updateGrades();
}

function removeSubject(semesterId) {
  const block = getSemesterBlock(semesterId);
  const pairs = [...block.querySelectorAll(".subject-pair")];
  if (pairs.length <= 1) return;
  pairs[pairs.length - 1].remove();
  updateGrades();
}

function appendSubjectPair(semesterId) {
  const block = getSemesterBlock(semesterId);
  const grid = block.querySelector(".subject-grid");
  const subjectNumber = grid.querySelectorAll(".subject-pair").length + 1;
  const pair = document.createElement("div");
  pair.className = "subject-pair";
  pair.innerHTML = `
    <label>
      <span>등급</span>
      <input class="subject-grade" type="number" min="1" max="9" step="0.01" inputmode="decimal" aria-label="${subjectNumber}번째 과목 등급" />
    </label>
    <label>
      <span>이수단위</span>
      <input class="subject-unit" type="number" min="0" max="20" step="0.5" inputmode="decimal" aria-label="${subjectNumber}번째 과목 이수단위" />
    </label>
  `;
  pair.querySelectorAll("input").forEach((input) => input.addEventListener("input", updateGrades));
  grid.append(pair);
}

function updateGrades() {
  state.semesterAverages = {};

  SEMESTERS.forEach((semester) => {
    const block = getSemesterBlock(semester.id);
    let weightedSum = 0;
    let unitSum = 0;

    block.querySelectorAll(".subject-pair").forEach((pair) => {
      const grade = Number.parseFloat(pair.querySelector(".subject-grade").value);
      const unit = Number.parseFloat(pair.querySelector(".subject-unit").value);
      if (Number.isFinite(grade) && grade >= 1 && grade <= 9 && Number.isFinite(unit) && unit > 0) {
        weightedSum += grade * unit;
        unitSum += unit;
      }
    });

    const average = unitSum > 0 ? weightedSum / unitSum : null;
    state.semesterAverages[semester.id] = average;
    block.querySelector(".semester-average").value = average === null ? "-" : formatGrade(average);
  });

  const completed = SEMESTERS.map((semester) => ({
    ...semester,
    average: state.semesterAverages[semester.id],
  })).filter((semester) => Number.isFinite(semester.average));

  semesterCount.textContent = `${completed.length}개`;

  if (!completed.length) {
    state.grade = null;
    averageGrade.textContent = "-";
    bestSemester.textContent = "-";
    gradeInput.value = "";
    state.filtered = [];
    render();
    return;
  }

  const best = completed.sort((a, b) => a.average - b.average)[0];
  state.grade = best.average;
  averageGrade.textContent = formatGrade(best.average);
  bestSemester.textContent = best.label;
  gradeInput.value = best.average.toFixed(2);
  applyFilters();
}

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
    .filter((row) => !region || row.region === region)
    .filter((row) => !track || row.track === track)
    .filter((row) => !round || row.round === round)
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
      ? "조건에 맞는 결과가 없습니다. 전형, 지역, 상향 허용 폭을 넓혀 다시 검색해 보세요."
      : "첫 번째 탭에서 내신을 입력한 뒤 조건 검색을 진행하세요.";
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
  buildSemesterInputs();

  try {
    const response = await fetch("data/admissions.json");
    if (!response.ok) throw new Error("데이터를 불러오지 못했습니다.");
    state.rows = await response.json();
    dataCount.textContent = `${state.rows.length.toLocaleString("ko-KR")}건`;
    populateRegions(state.rows);
  } catch (error) {
    emptyState.textContent = "입결 데이터를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
    dataCount.textContent = "오류";
    console.error(error);
  }
}

gradeTabButton.addEventListener("click", () => switchTab("grade"));
searchTabButton.addEventListener("click", () => switchTab("search"));
goSearchButton.addEventListener("click", () => switchTab("search"));

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  applyFilters();
});

[roundFilter, trackFilter, regionFilter, keywordInput, reachFilter, gradeInput].forEach((element) => {
  element.addEventListener("input", applyFilters);
});

sortFilter.addEventListener("input", () => {
  sortRows();
  render();
});

boot();

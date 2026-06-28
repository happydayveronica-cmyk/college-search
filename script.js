const SEMESTERS = [
  { id: "s11", label: "1학년 1학기", year: 1 },
  { id: "s12", label: "1학년 2학기", year: 1 },
  { id: "s21", label: "2학년 1학기", year: 2 },
  { id: "s22", label: "2학년 2학기", year: 2 },
  { id: "s31", label: "3학년 1학기", year: 3 },
];
const CAREER_SEMESTERS = SEMESTERS.filter((semester) => ["s21", "s22", "s31"].includes(semester.id));
const DEFAULT_SUBJECTS = 5;
const ACHIEVEMENTS = ["A", "B", "C", "D", "E"];

const state = {
  rows: [],
  filtered: [],
  studentRules: [],
  attendanceRules: [],
  prospectusRows: [],
  grade: null,
  semesterAverages: {},
  semesterSubjects: {},
  careerSubjects: {},
  attendance: { absence: 0, late: 0, early: 0, miss: 0 },
};

const tabButtons = {
  grade: document.querySelector("#gradeTabButton"),
  attendance: document.querySelector("#attendanceTabButton"),
  search: document.querySelector("#searchTabButton"),
  prospectus: document.querySelector("#prospectusTabButton"),
};
const tabPanels = {
  grade: document.querySelector("#gradeTab"),
  attendance: document.querySelector("#attendanceTab"),
  search: document.querySelector("#searchTab"),
  prospectus: document.querySelector("#prospectusTab"),
};

const searchOutput = document.querySelector("#searchOutput");
const semesterContainer = document.querySelector("#semesterContainer");
const careerContainer = document.querySelector("#careerContainer");
const averageGrade = document.querySelector("#averageGrade");
const bestSemester = document.querySelector("#bestSemester");
const semesterCount = document.querySelector("#semesterCount");
const attendanceDays = document.querySelector("#attendanceDays");
const attendanceRuleCount = document.querySelector("#attendanceRuleCount");
const careerRuleCount = document.querySelector("#careerRuleCount");
const careerSubjectCount = document.querySelector("#careerSubjectCount");
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
const prospectusRegionFilter = document.querySelector("#prospectusRegionFilter");
const prospectusKeywordInput = document.querySelector("#prospectusKeywordInput");
const prospectusCount = document.querySelector("#prospectusCount");
const prospectusCards = document.querySelector("#prospectusCards");

const formatGrade = (value) => (Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, "") : "-");
const formatCount = (value) => (Number.isFinite(value) ? `${value.toLocaleString("ko-KR")}명` : "-");

function switchTab(target) {
  Object.entries(tabButtons).forEach(([key, button]) => {
    const active = key === target;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    tabPanels[key].classList.toggle("active", active);
    tabPanels[key].hidden = !active;
  });
  searchOutput.hidden = target !== "search";
}

function buildSemesterInputs() {
  semesterContainer.innerHTML = SEMESTERS.map((semester) => renderSemesterBlock(semester, "subject")).join("");
  SEMESTERS.forEach((semester) => {
    const block = getSemesterBlock(semester.id, "subject");
    block.querySelector(".add-subject").addEventListener("click", () => addSubject(semester.id, "subject"));
    block.querySelector(".remove-subject").addEventListener("click", () => removeSubject(semester.id, "subject"));
    for (let index = 0; index < DEFAULT_SUBJECTS; index += 1) appendSubjectPair(semester.id, "subject");
  });

  careerContainer.innerHTML = CAREER_SEMESTERS.map((semester) => renderSemesterBlock(semester, "career")).join("");
  CAREER_SEMESTERS.forEach((semester) => {
    const block = getSemesterBlock(semester.id, "career");
    block.querySelector(".add-subject").addEventListener("click", () => addSubject(semester.id, "career"));
    block.querySelector(".remove-subject").addEventListener("click", () => removeSubject(semester.id, "career"));
    for (let index = 0; index < 3; index += 1) appendSubjectPair(semester.id, "career");
  });

  updateGrades();
}

function renderSemesterBlock(semester, type) {
  const title = type === "career" ? `${semester.label} 진로선택` : semester.label;
  return `
    <section class="semester-block" data-semester="${semester.id}" data-type="${type}">
      <div class="semester-head">
        <div class="semester-title">
          <h2>${title}</h2>
          <input class="semester-average" type="text" value="-" aria-label="${title} 평균" readonly />
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

function getSemesterBlock(semesterId, type) {
  const container = type === "career" ? careerContainer : semesterContainer;
  return container.querySelector(`[data-semester="${semesterId}"]`);
}

function addSubject(semesterId, type) {
  appendSubjectPair(semesterId, type);
  updateGrades();
}

function removeSubject(semesterId, type) {
  const block = getSemesterBlock(semesterId, type);
  const pairs = [...block.querySelectorAll(".subject-pair")];
  if (pairs.length <= 1) return;
  pairs[pairs.length - 1].remove();
  updateGrades();
}

function appendSubjectPair(semesterId, type) {
  const block = getSemesterBlock(semesterId, type);
  const grid = block.querySelector(".subject-grid");
  const subjectNumber = grid.querySelectorAll(".subject-pair").length + 1;
  const pair = document.createElement("div");
  pair.className = "subject-pair";

  if (type === "career") {
    pair.innerHTML = `
      <label>
        <span>성취도</span>
        <select class="career-achievement" aria-label="${subjectNumber}번째 진로선택 성취도">
          <option value="">선택</option>
          ${ACHIEVEMENTS.map((value) => `<option value="${value}">${value}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>이수단위</span>
        <input class="subject-unit" type="number" min="0" max="20" step="0.5" inputmode="decimal" aria-label="${subjectNumber}번째 진로선택 이수단위" />
      </label>
    `;
  } else {
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
  }

  pair.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", updateGrades));
  grid.append(pair);
}

function updateGrades() {
  state.semesterAverages = {};
  state.semesterSubjects = {};
  state.careerSubjects = {};

  SEMESTERS.forEach((semester) => {
    const subjects = readRegularSubjects(semester.id);
    state.semesterSubjects[semester.id] = subjects;
    const average = averageSubjects(subjects);
    state.semesterAverages[semester.id] = average;
    getSemesterBlock(semester.id, "subject").querySelector(".semester-average").value =
      average === null ? "-" : formatGrade(average);
  });

  CAREER_SEMESTERS.forEach((semester) => {
    const subjects = readCareerSubjects(semester.id);
    state.careerSubjects[semester.id] = subjects;
    getSemesterBlock(semester.id, "career").querySelector(".semester-average").value =
      subjects.length ? `${subjects.length}개` : "-";
  });

  const fallback = calculateByMethod("1학년~3학년 1학기 5개 학기 중 최우수 1개 학기", "");
  const completed = getCompletedSemesters();
  semesterCount.textContent = `${completed.length}개`;
  careerSubjectCount.textContent = `${Object.values(state.careerSubjects).flat().length}개`;

  if (!Number.isFinite(fallback.grade)) {
    state.grade = null;
    averageGrade.textContent = "-";
    bestSemester.textContent = "-";
    gradeInput.value = "";
    state.filtered = [];
    render();
    return;
  }

  state.grade = fallback.grade;
  averageGrade.textContent = formatGrade(fallback.grade);
  bestSemester.textContent = fallback.label;
  gradeInput.value = fallback.grade.toFixed(2);
  applyFilters();
}

function readRegularSubjects(semesterId) {
  return [...getSemesterBlock(semesterId, "subject").querySelectorAll(".subject-pair")]
    .map((pair) => ({
      grade: Number.parseFloat(pair.querySelector(".subject-grade").value),
      unit: Number.parseFloat(pair.querySelector(".subject-unit").value),
    }))
    .filter(({ grade, unit }) => Number.isFinite(grade) && grade >= 1 && grade <= 9 && Number.isFinite(unit) && unit > 0);
}

function readCareerSubjects(semesterId) {
  return [...getSemesterBlock(semesterId, "career").querySelectorAll(".subject-pair")]
    .map((pair) => ({
      achievement: pair.querySelector(".career-achievement").value,
      unit: Number.parseFloat(pair.querySelector(".subject-unit").value),
    }))
    .filter(({ achievement, unit }) => achievement && Number.isFinite(unit) && unit > 0);
}

function averageSubjects(subjects) {
  const unitSum = subjects.reduce((sum, subject) => sum + subject.unit, 0);
  if (!unitSum) return null;
  return subjects.reduce((sum, subject) => sum + subject.grade * subject.unit, 0) / unitSum;
}

function parseCareerMap(method) {
  if (!method) return null;
  const matches = [...method.matchAll(/([ABC])\s*=\s*(\d+(?:\.\d+)?)등급/g)];
  if (!matches.length) return null;
  const map = {};
  matches.forEach((match) => {
    map[match[1]] = Number(match[2]);
  });
  const known = ["A", "B", "C"].filter((key) => Number.isFinite(map[key]));
  const step = known.length >= 2 ? map[known[known.length - 1]] - map[known[known.length - 2]] : 2;
  map.D = Math.min(9, (map.C ?? 7) + step);
  map.E = Math.min(9, map.D + step);
  return map;
}

function getCombinedSubjects(semesterId, careerMethod) {
  const subjects = [...(state.semesterSubjects[semesterId] ?? [])];
  const careerMap = parseCareerMap(careerMethod);
  if (careerMap) {
    (state.careerSubjects[semesterId] ?? []).forEach((subject) => {
      const grade = careerMap[subject.achievement];
      if (Number.isFinite(grade)) subjects.push({ grade, unit: subject.unit });
    });
  }
  return subjects;
}

function semesterAverage(semesterId, careerMethod) {
  return averageSubjects(getCombinedSubjects(semesterId, careerMethod));
}

function getCompletedSemesters(ids = SEMESTERS.map((semester) => semester.id), careerMethod = "") {
  return ids
    .map((id) => {
      const semester = SEMESTERS.find((item) => item.id === id);
      return { ...semester, average: semesterAverage(id, careerMethod) };
    })
    .filter((semester) => Number.isFinite(semester.average));
}

function bestSemesterAverage(ids, count, careerMethod) {
  const selected = getCompletedSemesters(ids, careerMethod)
    .sort((a, b) => a.average - b.average)
    .slice(0, count);
  if (!selected.length) return { grade: null, label: "입력 필요" };
  const grade = selected.reduce((sum, semester) => sum + semester.average, 0) / selected.length;
  return { grade, label: selected.map((semester) => semester.label).join(", ") };
}

function allSemesterAverage(ids, careerMethod) {
  const selected = getCompletedSemesters(ids, careerMethod);
  if (!selected.length) return { grade: null, label: "입력 필요" };
  const grade = selected.reduce((sum, semester) => sum + semester.average, 0) / selected.length;
  return { grade, label: selected.map((semester) => semester.label).join(", ") };
}

function weightedYearAverage(weights, careerMethod) {
  let weightedSum = 0;
  let weightSum = 0;
  const labels = [];
  Object.entries(weights).forEach(([year, weight]) => {
    const ids = SEMESTERS.filter((semester) => semester.year === Number(year)).map((semester) => semester.id);
    const yearAverage = allSemesterAverage(ids, careerMethod);
    if (Number.isFinite(yearAverage.grade)) {
      weightedSum += yearAverage.grade * weight;
      weightSum += weight;
      labels.push(`${year}학년 ${formatGrade(yearAverage.grade)}×${weight}`);
    }
  });
  if (!weightSum) return { grade: null, label: "입력 필요" };
  return { grade: weightedSum / weightSum, label: labels.join(" + ") };
}

function specialOnePerYearAverage(careerMethod) {
  const parts = [
    { ...bestSemesterAverage(["s11", "s12"], 1, careerMethod), weight: 30 },
    { ...bestSemesterAverage(["s21", "s22"], 1, careerMethod), weight: 30 },
    { ...allSemesterAverage(["s31"], careerMethod), weight: 40 },
  ].filter((part) => Number.isFinite(part.grade));
  if (!parts.length) return { grade: null, label: "입력 필요" };
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
  const grade = parts.reduce((sum, part) => sum + part.grade * part.weight, 0) / weightSum;
  return { grade, label: parts.map((part) => `${part.label} ${part.weight}%`).join(" + ") };
}

function calculateByMethod(method = "", careerMethod = "") {
  const normalized = method.replace(/\s+/g, " ").trim();
  const allFive = ["s11", "s12", "s21", "s22", "s31"];
  const firstTwoYears = ["s11", "s12", "s21", "s22"];
  if (!normalized) return bestSemesterAverage(allFive, 1, careerMethod);
  if (normalized.includes("1학년 우수") && normalized.includes("3학년 1학기 40")) return specialOnePerYearAverage(careerMethod);
  if (normalized.includes("1학년 40") && normalized.includes("2학년 40")) return weightedYearAverage({ 1: 40, 2: 40, 3: 20 }, careerMethod);
  if (normalized.includes("1학년 2개 학기") || normalized.includes("1학년 총 2개 학기")) return allSemesterAverage(["s11", "s12"], careerMethod);
  if (normalized.includes("2학년 2개 학기")) return allSemesterAverage(["s21", "s22"], careerMethod);
  if (normalized.includes("1학년~2학년 4개 학기") || normalized.includes("1~2학년 4개 학기")) {
    if (normalized.includes("우수 2개")) return bestSemesterAverage(firstTwoYears, 2, careerMethod);
    return bestSemesterAverage(firstTwoYears, 1, careerMethod);
  }
  if (normalized.includes("우수 3개 학기")) return bestSemesterAverage(allFive, 3, careerMethod);
  if (normalized.includes("우수 2개 학기") || normalized.includes("최우수 2개 학기")) return bestSemesterAverage(allFive, 2, careerMethod);
  if (normalized.includes("5개 학기 모두") || normalized.includes("전체 5개 학기")) return allSemesterAverage(allFive, careerMethod);
  return bestSemesterAverage(allFive, 1, careerMethod);
}

function normalizeCollege(name) {
  return String(name ?? "")
    .replace(/\s+/g, "")
    .replaceAll("대학교", "대")
    .replaceAll("전문대학", "전문대")
    .replaceAll("여자대", "여대");
}

function baseCollegeKey(name) {
  return normalizeCollege(name).replace(/\(.+?\)/g, "");
}

function majorMatches(scope, major) {
  if (!scope || scope.includes("전체") || scope.includes("해당")) return true;
  return scope
    .split(/[,/·]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .some((item) => major.includes(item) || item.includes(major));
}

function findStudentRule(row) {
  const collegeKeys = new Set([normalizeCollege(row.college), baseCollegeKey(row.college)]);
  const matches = state.studentRules
    .filter((rule) => collegeKeys.has(rule.collegeKey) || collegeKeys.has(baseCollegeKey(rule.college)))
    .filter((rule) => majorMatches(rule.majorScope, row.major));
  return matches.sort((a, b) => Number(a.majorScope.includes("전체") || a.majorScope.includes("해당")) - Number(b.majorScope.includes("전체") || b.majorScope.includes("해당")))[0] ?? null;
}

function findAttendanceRule(row) {
  const collegeKeys = new Set([normalizeCollege(row.college), baseCollegeKey(row.college)]);
  return state.attendanceRules.find((rule) => collegeKeys.has(rule.collegeKey) || collegeKeys.has(baseCollegeKey(rule.college))) ?? null;
}

function readAttendanceInputs() {
  const read = (selector) => Math.max(0, Number.parseFloat(document.querySelector(selector).value) || 0);
  state.attendance = {
    absence: read("#absenceInput"),
    late: read("#lateInput"),
    early: read("#earlyInput"),
    miss: read("#missInput"),
  };
  attendanceDays.textContent = `${effectiveAttendanceDays(null)}일`;
  applyFilters();
}

function effectiveAttendanceDays(rule) {
  const { absence, late, early, miss } = state.attendance;
  const notes = (rule?.notes ?? []).join(" ");
  if (notes.includes("결석만") && !notes.includes("지각")) return Math.ceil(absence);
  const converted = absence + (late + early + miss) / 3;
  if (notes.includes("반올림")) return Math.round(converted);
  return Math.floor(converted);
}

function parseDayValue(value) {
  const text = String(value);
  const number = Number.parseFloat(text);
  return { number, isOrMore: text.includes("이상") };
}

function attendanceScore(rule) {
  if (!rule?.tables?.length) return null;
  const days = effectiveAttendanceDays(rule);
  const rows = rule.tables.flatMap((table) => table.rows.map((row) => ({ ...row, label: table.label })));
  const numericRows = rows
    .map((row) => ({ ...row, dayInfo: parseDayValue(row.day), scoreNumber: Number.parseFloat(row.score) }))
    .filter((row) => Number.isFinite(row.dayInfo.number) && Number.isFinite(row.scoreNumber))
    .sort((a, b) => a.dayInfo.number - b.dayInfo.number);
  if (!numericRows.length) return null;
  const maxScore = Math.max(...numericRows.map((row) => row.scoreNumber));
  const selected =
    numericRows.find((row) => row.dayInfo.isOrMore && days >= row.dayInfo.number) ??
    numericRows.find((row) => row.dayInfo.number === days) ??
    numericRows.filter((row) => row.dayInfo.number <= days).at(-1) ??
    numericRows[0];
  const penalty = maxScore ? Math.max(0, (maxScore - selected.scoreNumber) / maxScore) : 0;
  return {
    days,
    score: selected.scoreNumber,
    maxScore,
    label: selected.label,
    penaltyGrade: Math.min(1, penalty),
    notes: rule.notes.join(" "),
  };
}

function judge(row, grade, reach) {
  if (!Number.isFinite(grade)) return null;
  if (Number.isFinite(row.avgGrade) && grade <= row.avgGrade) return { key: "safe", label: "안정권", rank: 0 };
  if (Number.isFinite(row.cutoffGrade) && grade <= row.cutoffGrade) return { key: "match", label: "적정권", rank: 1 };
  if (Number.isFinite(row.cutoffGrade) && grade <= row.cutoffGrade + reach) return { key: "reach", label: "상향권", rank: 2 };
  if (!Number.isFinite(row.cutoffGrade) && Number.isFinite(row.avgGrade) && grade <= row.avgGrade + reach) return { key: "reference", label: "참고권", rank: 3 };
  return null;
}

function populateRegions(rows) {
  const regions = [...new Set(rows.map((row) => row.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko-KR"));
  regionFilter.insertAdjacentHTML("beforeend", regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join(""));
}

function populateProspectusRegions(rows) {
  const regions = [...new Set(rows.map((row) => row.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko-KR"));
  prospectusRegionFilter.insertAdjacentHTML("beforeend", regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join(""));
}

function applyFilters() {
  const manualGrade = Number.parseFloat(gradeInput.value);
  const reach = Number.parseFloat(reachFilter.value);
  const round = roundFilter.value;
  const track = trackFilter.value;
  const region = regionFilter.value;
  const keyword = keywordInput.value.trim().toLowerCase();
  const hasSubjectGrades = getCompletedSemesters().length > 0;

  state.grade = Number.isFinite(manualGrade) ? manualGrade : null;
  if (!hasSubjectGrades && (!Number.isFinite(manualGrade) || manualGrade < 1 || manualGrade > 9)) {
    state.filtered = [];
    render();
    return;
  }

  state.filtered = state.rows
    .map((row) => {
      const studentRule = findStudentRule(row);
      const method = studentRule ? `${studentRule.range} ${studentRule.method}` : row.scoreMethod2026;
      const applied = hasSubjectGrades ? calculateByMethod(method, studentRule?.careerMethod ?? "") : { grade: manualGrade, label: "직접 입력" };
      const attendance = attendanceScore(findAttendanceRule(row));
      const appliedGrade = Number.isFinite(applied.grade) ? applied.grade : manualGrade;
      const finalGrade = Number.isFinite(attendance?.penaltyGrade) ? appliedGrade + attendance.penaltyGrade : appliedGrade;
      return {
        ...row,
        studentRule,
        attendance,
        appliedGrade,
        finalGrade,
        appliedGradeLabel: applied.label,
        careerMethod: studentRule?.careerMethod ?? "",
        judgement: judge(row, finalGrade, reach),
      };
    })
    .filter((row) => row.judgement)
    .filter((row) => !region || row.region === region)
    .filter((row) => !track || row.track === track)
    .filter((row) => !round || row.round === round)
    .filter((row) => !keyword || `${row.college} ${row.major}`.toLowerCase().includes(keyword));

  sortRows();
  render();
}

function sortRows() {
  const mode = sortFilter.value;
  state.filtered.sort((a, b) => {
    if (mode === "college") return `${a.college}${a.major}`.localeCompare(`${b.college}${b.major}`, "ko-KR");
    if (mode === "cutoff") return (b.cutoffGrade ?? 0) - (a.cutoffGrade ?? 0);
    return (
      a.judgement.rank - b.judgement.rank ||
      Math.abs((a.avgGrade ?? a.cutoffGrade ?? 9) - a.finalGrade) - Math.abs((b.avgGrade ?? b.cutoffGrade ?? 9) - b.finalGrade) ||
      `${a.college}${a.major}`.localeCompare(`${b.college}${b.major}`, "ko-KR")
    );
  });
}

function render() {
  resultCount.textContent = `${state.filtered.length.toLocaleString("ko-KR")}개`;
  results.innerHTML = "";
  if (!state.filtered.length) {
    emptyState.classList.remove("hidden");
    emptyState.textContent = state.grade ? "조건에 맞는 결과가 없습니다. 전형, 지역, 상향 허용 폭을 넓혀 다시 검색해 보세요." : "내신·출결 정보를 입력하고 조건 검색을 진행하세요.";
    return;
  }
  emptyState.classList.add("hidden");
  const visibleRows = state.filtered.slice(0, 120);
  results.innerHTML = visibleRows.map(renderRow).join("");
  if (state.filtered.length > visibleRows.length) {
    results.insertAdjacentHTML("beforeend", `<div class="empty-state">상위 ${visibleRows.length}개만 표시 중입니다. 필터를 추가하면 더 좁혀볼 수 있습니다.</div>`);
  }
}

function renderRow(row) {
  const method = row.studentRule ? `${row.studentRule.range} ${row.studentRule.method}` : row.scoreMethod2026 || "산출방법 확인 필요";
  const attendanceText = row.attendance ? `${row.attendance.days}일, ${row.attendance.label} ${formatGrade(row.attendance.score)}/${formatGrade(row.attendance.maxScore)}` : "미반영 또는 자료 없음";
  const careerText = row.careerMethod ? row.careerMethod : "미반영";
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
        <span>교과 산출 <strong>${formatGrade(row.appliedGrade)}</strong></span>
        <span>출결 보정 <strong>${formatGrade(row.finalGrade)}</strong></span>
        <span>평균 <strong>${formatGrade(row.avgGrade)}</strong> · 최저 <strong>${formatGrade(row.cutoffGrade)}</strong></span>
      </div>
      <p class="method">
        ${escapeHtml(method)}<br />
        <span>반영: ${escapeHtml(row.appliedGradeLabel || "-")}</span><br />
        <span>진로선택: ${escapeHtml(careerText)}</span><br />
        <span>출결: ${escapeHtml(attendanceText)}</span>
      </p>
    </article>
  `;
}

function applyProspectusFilters() {
  const region = prospectusRegionFilter.value;
  const keyword = prospectusKeywordInput.value.trim().toLowerCase();
  const filtered = state.prospectusRows
    .filter((row) => !region || row.region === region)
    .filter((row) => !keyword || row.college.toLowerCase().includes(keyword))
    .sort((a, b) => `${a.region}${a.college}`.localeCompare(`${b.region}${b.college}`, "ko-KR"));
  prospectusCount.textContent = `${filtered.length.toLocaleString("ko-KR")}개`;
  prospectusCards.innerHTML = filtered.length ? filtered.map(renderProspectusCard).join("") : `<div class="empty-state">조건에 맞는 학교가 없습니다.</div>`;
}

function renderProspectusCard(row) {
  const links = [
    { label: "대학별 자료", url: row.collegeData },
    { label: "전년도 입결", url: row.previousResult },
    { label: "모집요강", url: row.prospectus },
    { label: "내신성적 산출", url: row.gradeCalculator },
  ];
  return `
    <article class="prospectus-card">
      <span class="region">${escapeHtml(row.region)}</span>
      <h3>${escapeHtml(row.college)}</h3>
      <div class="prospectus-links">
        ${links.map(renderProspectusLink).join("")}
      </div>
    </article>
  `;
}

function renderProspectusLink(link) {
  if (!link.url) return `<span class="link-chip disabled">${escapeHtml(link.label)} 없음</span>`;
  return `<a class="link-chip" href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

async function boot() {
  buildSemesterInputs();
  Object.entries(tabButtons).forEach(([key, button]) => {
    button.addEventListener("click", () => switchTab(key));
  });
  document.querySelector("#goAttendanceButton").addEventListener("click", () => switchTab("attendance"));
  document.querySelector("#goSearchButton").addEventListener("click", () => switchTab("search"));
  ["#absenceInput", "#lateInput", "#earlyInput", "#missInput"].forEach((selector) => {
    document.querySelector(selector).addEventListener("input", readAttendanceInputs);
  });

  try {
    const [admissionResponse, rulesResponse, prospectusResponse] = await Promise.all([
      fetch("data/admissions.json"),
      fetch("data/school-rules.json"),
      fetch("data/prospectus.json"),
    ]);
    if (!admissionResponse.ok || !rulesResponse.ok || !prospectusResponse.ok) throw new Error("데이터를 불러오지 못했습니다.");
    state.rows = await admissionResponse.json();
    const rules = await rulesResponse.json();
    state.studentRules = rules.studentRules ?? [];
    state.attendanceRules = rules.attendanceRules ?? [];
    state.prospectusRows = await prospectusResponse.json();
    dataCount.textContent = `${state.rows.length.toLocaleString("ko-KR")}건`;
    attendanceRuleCount.textContent = `${state.attendanceRules.length}개`;
    careerRuleCount.textContent = `${state.studentRules.filter((rule) => rule.careerMethod).length}개`;
    populateRegions(state.rows);
    populateProspectusRegions(state.prospectusRows);
    applyProspectusFilters();
    readAttendanceInputs();
  } catch (error) {
    emptyState.textContent = "입결 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    dataCount.textContent = "오류";
    prospectusCards.innerHTML = `<div class="empty-state">모집요강 데이터를 불러오지 못했습니다.</div>`;
    console.error(error);
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  applyFilters();
});

[roundFilter, trackFilter, regionFilter, keywordInput, reachFilter, gradeInput].forEach((element) => {
  element.addEventListener("input", applyFilters);
});

[prospectusRegionFilter, prospectusKeywordInput].forEach((element) => {
  element.addEventListener("input", applyProspectusFilters);
});

sortFilter.addEventListener("input", () => {
  sortRows();
  render();
});

boot();

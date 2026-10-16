const user = requireSession("administrator");
document.getElementById("adminName").textContent = user ? user.name : "";

async function init() {
  await Promise.all([loadOverview(), loadTeachers(), loadReports(), loadCurriculum()]);
}

async function loadOverview() {
  const o = await API.get("/admin/overview");
  const items = [
    ["Teachers", o.teacherCount],
    ["Learners", o.learnerCount],
    ["Competency records", o.recordCount],
    ["Progress reports", o.reportCount],
  ];
  document.getElementById("overviewGrid").innerHTML = items
    .map(([label, num]) => `<div class="stat"><div class="num">${num}</div><div class="label">${label}</div></div>`)
    .join("");
}

async function loadTeachers() {
  const teachers = await API.get("/admin/teachers");
  document.querySelector("#teacherTable tbody").innerHTML =
    teachers
      .map(
        (t) => `<tr>
          <td>${t.Name}</td><td>${t.Email}</td><td>${t.TSCNumber || ""}</td>
          <td><button class="danger" style="margin:0;" onclick="removeTeacher(${t.UserID})">Remove</button></td>
        </tr>`
      )
      .join("") || `<tr><td colspan="4" class="hint">No teachers yet.</td></tr>`;
}

async function removeTeacher(id) {
  if (!confirm("Remove this teacher account?")) return;
  await API.del(`/admin/teachers/${id}`);
  await Promise.all([loadTeachers(), loadOverview()]);
}

async function loadReports() {
  const reports = await API.get("/admin/reports");
  document.querySelector("#reportTable tbody").innerHTML =
    reports
      .map(
        (r) => `<tr>
          <td>${r.LearnerName}</td><td>${r.GradeLevel}</td>
          <td>${new Date(r.DateGenerated).toLocaleDateString()}</td><td>${r.AttainmentSummary}</td>
        </tr>`
      )
      .join("") || `<tr><td colspan="4" class="hint">No reports generated yet.</td></tr>`;
}

let strandTree = [];
async function loadCurriculum() {
  strandTree = await API.get("/curriculum/strands");
  document.getElementById("ssStrand").innerHTML = strandTree
    .map((s) => `<option value="${s.StrandID}">${s.Name}</option>`)
    .join("");
  const subStrands = strandTree.flatMap((s) => s.subStrands.map((ss) => ({ ...ss, StrandName: s.Name })));
  document.getElementById("ciSubStrand").innerHTML = subStrands
    .map((ss) => `<option value="${ss.SubStrandID}">${ss.StrandName} \u203a ${ss.Name}</option>`)
    .join("");
}

function flashCurriculumMsg(text) {
  const el = document.getElementById("curriculumMsg");
  el.textContent = text;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
}

document.getElementById("strandForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await API.post("/admin/curriculum/strand", { name: document.getElementById("strandName").value });
  e.target.reset();
  await loadCurriculum();
  flashCurriculumMsg("Strand added.");
});

document.getElementById("subStrandForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await API.post("/admin/curriculum/substrand", {
    name: document.getElementById("ssName").value,
    strandId: Number(document.getElementById("ssStrand").value),
  });
  document.getElementById("ssName").value = "";
  await loadCurriculum();
  flashCurriculumMsg("Sub-strand added.");
});

document.getElementById("indicatorForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await API.post("/admin/curriculum/indicator", {
    description: document.getElementById("ciDesc").value,
    subStrandId: Number(document.getElementById("ciSubStrand").value),
  });
  document.getElementById("ciDesc").value = "";
  await loadCurriculum();
  flashCurriculumMsg("Indicator added.");
});

init();

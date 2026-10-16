const express = require("express");
const db = require("../db/init");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("administrator"));

// GET /api/admin/teachers — use case: Manage teacher accounts
router.get("/teachers", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.UserID, u.Name, u.Email, t.TSCNumber
       FROM User u JOIN Teacher t ON t.UserID = u.UserID
       WHERE u.SchoolID = ?
       ORDER BY u.Name`
    )
    .all(req.user.schoolId);
  res.json(rows);
});

// DELETE /api/admin/teachers/:id — use case: Manage teacher accounts
router.delete("/teachers/:id", (req, res) => {
  db.prepare("DELETE FROM User WHERE UserID = ? AND SchoolID = ? AND Role = 'teacher'").run(
    req.params.id,
    req.user.schoolId
  );
  res.json({ message: "Teacher account removed" });
});

// GET /api/admin/reports — use case: View school reports
router.get("/reports", (req, res) => {
  const rows = db
    .prepare(
      `SELECT pr.*, l.Name AS LearnerName, l.GradeLevel
       FROM Progress_Report pr
       JOIN Learner l ON l.LearnerID = pr.LearnerID
       WHERE l.SchoolID = ?
       ORDER BY pr.DateGenerated DESC`
    )
    .all(req.user.schoolId);
  res.json(rows);
});

// GET /api/admin/overview — dashboard counts
router.get("/overview", (req, res) => {
  const schoolId = req.user.schoolId;
  const teacherCount = db
    .prepare("SELECT COUNT(*) c FROM User WHERE Role='teacher' AND SchoolID=?")
    .get(schoolId).c;
  const learnerCount = db.prepare("SELECT COUNT(*) c FROM Learner WHERE SchoolID=?").get(schoolId).c;
  const recordCount = db
    .prepare(
      `SELECT COUNT(*) c FROM Competency_Records cr
       JOIN Learner l ON l.LearnerID = cr.LearnerID WHERE l.SchoolID=?`
    )
    .get(schoolId).c;
  const reportCount = db
    .prepare(
      `SELECT COUNT(*) c FROM Progress_Report pr
       JOIN Learner l ON l.LearnerID = pr.LearnerID WHERE l.SchoolID=?`
    )
    .get(schoolId).c;

  res.json({ teacherCount, learnerCount, recordCount, reportCount });
});

// POST /api/admin/curriculum/strand — use case: Configure curriculum parameters
router.post("/curriculum/strand", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const info = db.prepare("INSERT INTO Strand (Name) VALUES (?)").run(name);
  res.status(201).json({ StrandID: info.lastInsertRowid, Name: name });
});

// POST /api/admin/curriculum/substrand — use case: Configure curriculum parameters
router.post("/curriculum/substrand", (req, res) => {
  const { name, strandId } = req.body;
  if (!name || !strandId) return res.status(400).json({ error: "name and strandId are required" });
  const info = db.prepare("INSERT INTO Sub_Strand (Name, StrandID) VALUES (?, ?)").run(name, strandId);
  res.status(201).json({ SubStrandID: info.lastInsertRowid, Name: name, StrandID: strandId });
});

// POST /api/admin/curriculum/indicator — use case: Configure curriculum parameters
router.post("/curriculum/indicator", (req, res) => {
  const { description, subStrandId } = req.body;
  if (!description || !subStrandId) {
    return res.status(400).json({ error: "description and subStrandId are required" });
  }
  const info = db
    .prepare("INSERT INTO Competency_Indicator (Description, SubStrandID) VALUES (?, ?)")
    .run(description, subStrandId);
  res.status(201).json({ IndicatorID: info.lastInsertRowid, Description: description, SubStrandID: subStrandId });
});

module.exports = router;

const express = require("express");
const mysql = require("mysql2/promise");
const os = require("os");

const app = express();
const PORT = 3000;

app.use(express.json());

// -----------------------------------------------------------
// DB connection pool — reads credentials from env variables
// (set via docker-compose / Swarm stack file)
// -----------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "secret",
  database: process.env.DB_NAME || "todo_db",
  waitForConnections: true,
  connectionLimit: 10,
});

// -----------------------------------------------------------
// Health check — also confirms DB is reachable
// Returns the container hostname so we can see load balancing
// -----------------------------------------------------------
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      container: os.hostname(),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// -----------------------------------------------------------
// GET /api/tasks — list all tasks (optional ?status= filter)
// -----------------------------------------------------------
app.get("/api/tasks", async (req, res) => {
  try {
    const { status } = req.query;
    let sql = "SELECT * FROM tasks ORDER BY created_at DESC";
    let params = [];

    if (status) {
      sql =
        "SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC";
      params = [status];
    }

    const [rows] = await pool.query(sql, params);
    res.json({ count: rows.length, tasks: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------------
// GET /api/tasks/:id — get a single task
// -----------------------------------------------------------
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------------
// POST /api/tasks — create a new task
// Body: { title, description? }
// -----------------------------------------------------------
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description = "" } = req.body;
    if (!title)
      return res.status(400).json({ error: "title is required" });

    const [result] = await pool.query(
      "INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)",
      [title, description, "pending"]
    );

    res.status(201).json({
      id: result.insertId,
      title,
      description,
      status: "pending",
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------------
// PATCH /api/tasks/:id — update status or title
// Body: { status?, title?, description? }
// -----------------------------------------------------------
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const allowed = ["pending", "in_progress", "done"];

    if (status && !allowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `status must be one of: ${allowed.join(", ")}` });
    }

    const [existing] = await pool.query(
      "SELECT * FROM tasks WHERE id = ?",
      [req.params.id]
    );
    if (existing.length === 0)
      return res.status(404).json({ error: "Task not found" });

    const updated = {
      title: title ?? existing[0].title,
      description: description ?? existing[0].description,
      status: status ?? existing[0].status,
    };

    await pool.query(
      "UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?",
      [updated.title, updated.description, updated.status, req.params.id]
    );

    res.json({ id: Number(req.params.id), ...updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -----------------------------------------------------------
// DELETE /api/tasks/:id — remove a task
// -----------------------------------------------------------
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM tasks WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json({ deleted: true, id: Number(req.params.id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () =>
  console.log(`Todo API running on port ${PORT} | container: ${os.hostname()}`)
);

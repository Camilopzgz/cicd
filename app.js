const express = require("express");
const TaskManager = require("./taskManager");
const { validateTask } = require("./validators");

const app = express();

// Middleware
app.use(express.json());

// Rutas principales
app.get("/", (req, res) => {
  res.json({ message: "DevOps Lab Running", version: "1.0.0" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// CRUD de tareas
app.post("/tasks", validateTask, (req, res) => {
  const { title, description } = req.body;
  const task = TaskManager.createTask(title, description);
  res.status(201).json(task);
});

app.get("/tasks", (req, res) => {
  const tasks = TaskManager.getTasks();
  res.json({ total: tasks.length, tasks });
});

app.get("/tasks/:id", (req, res) => {
  const task = TaskManager.getTaskById(req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: "Tarea no encontrada" });
  }
  
  res.json(task);
});

app.put("/tasks/:id", validateTask, (req, res) => {
  const { title, description, completed } = req.body;
  const task = TaskManager.updateTask(req.params.id, title, description, completed);
  
  if (!task) {
    return res.status(404).json({ error: "Tarea no encontrada" });
  }
  
  res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
  const deleted = TaskManager.deleteTask(req.params.id);
  
  if (!deleted) {
    return res.status(404).json({ error: "Tarea no encontrada" });
  }
  
  res.json({ message: "Tarea eliminada correctamente" });
});

app.get("/tasks/status/:status", (req, res) => {
  const validStatus = ["completed", "pending"];
  const status = req.params.status.toLowerCase();
  
  if (!validStatus.includes(status)) {
    return res.status(400).json({ error: "Estado inválido. Use 'completed' o 'pending'" });
  }
  
  const isCompleted = status === "completed";
  const filteredTasks = TaskManager.getTasksByStatus(isCompleted);
  
  res.json({ status, total: filteredTasks.length, tasks: filteredTasks });
});

app.get("/stats", (req, res) => {
  res.json({
    total: TaskManager.getTotalTasks(),
    completed: TaskManager.getCompletedCount(),
    pending: TaskManager.getPendingCount()
  });
});

// Middleware de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Exportar para testing
module.exports = app;

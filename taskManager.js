// Lógica de negocio para la gestión de tareas
let tasks = [];
let taskId = 1;

class TaskManager {
  static createTask(title, description = "") {
    const task = {
      id: taskId++,
      title: title.trim(),
      description: description.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    tasks.push(task);
    return task;
  }

  static getTasks() {
    return tasks;
  }

  static getTaskById(id) {
    return tasks.find(t => t.id === parseInt(id));
  }

  static updateTask(id, title, description, completed) {
    const task = this.getTaskById(id);
    if (!task) return null;
    
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (completed !== undefined) task.completed = Boolean(completed);
    
    return task;
  }

  static deleteTask(id) {
    const index = tasks.findIndex(t => t.id === parseInt(id));
    if (index === -1) return false;
    
    tasks.splice(index, 1);
    return true;
  }

  static getTasksByStatus(completed) {
    return tasks.filter(t => t.completed === Boolean(completed));
  }

  static resetTasks() {
    tasks = [];
    taskId = 1;
  }

  static getTotalTasks() {
    return tasks.length;
  }

  static getCompletedCount() {
    return tasks.filter(t => t.completed).length;
  }

  static getPendingCount() {
    return tasks.filter(t => !t.completed).length;
  }
}

module.exports = TaskManager;

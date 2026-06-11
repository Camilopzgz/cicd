// Pruebas unitarias para TaskManager
const TaskManager = require("../taskManager");

describe("TaskManager - Gestión de Tareas", () => {
  
  beforeEach(() => {
    // Limpiar estado antes de cada prueba
    TaskManager.resetTasks();
  });

  describe("Crear Tareas", () => {
    test("debe crear una tarea con título y descripción", () => {
      const task = TaskManager.createTask("Aprender DevOps", "Completar el curso");
      
      expect(task).toBeDefined();
      expect(task.id).toBe(1);
      expect(task.title).toBe("Aprender DevOps");
      expect(task.description).toBe("Completar el curso");
      expect(task.completed).toBe(false);
      expect(task.createdAt).toBeDefined();
    });

    test("debe crear una tarea solo con título", () => {
      const task = TaskManager.createTask("Tarea simple");
      
      expect(task.title).toBe("Tarea simple");
      expect(task.description).toBe("");
    });

    test("debe asignar IDs secuenciales", () => {
      const task1 = TaskManager.createTask("Tarea 1");
      const task2 = TaskManager.createTask("Tarea 2");
      const task3 = TaskManager.createTask("Tarea 3");
      
      expect(task1.id).toBe(1);
      expect(task2.id).toBe(2);
      expect(task3.id).toBe(3);
    });

    test("debe trimear espacios en blanco", () => {
      const task = TaskManager.createTask("  Tarea con espacios  ", "  Descripción  ");
      
      expect(task.title).toBe("Tarea con espacios");
      expect(task.description).toBe("Descripción");
    });
  });

  describe("Obtener Tareas", () => {
    test("debe retornar lista vacía inicialmente", () => {
      const tasks = TaskManager.getTasks();
      expect(tasks).toEqual([]);
    });

    test("debe retornar todas las tareas creadas", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.createTask("Tarea 2");
      
      const tasks = TaskManager.getTasks();
      expect(tasks.length).toBe(2);
    });

    test("debe obtener tarea por ID", () => {
      TaskManager.createTask("Tarea Especial");
      const task = TaskManager.getTaskById(1);
      
      expect(task).toBeDefined();
      expect(task.title).toBe("Tarea Especial");
    });

    test("debe retornar null si ID no existe", () => {
      const task = TaskManager.getTaskById(999);
      expect(task).toBeUndefined();
    });
  });

  describe("Actualizar Tareas", () => {
    test("debe actualizar el título de una tarea", () => {
      TaskManager.createTask("Título Original");
      const updated = TaskManager.updateTask(1, "Título Nuevo");
      
      expect(updated.title).toBe("Título Nuevo");
    });

    test("debe actualizar la descripción de una tarea", () => {
      TaskManager.createTask("Tarea", "Descripción Original");
      const updated = TaskManager.updateTask(1, undefined, "Descripción Nueva");
      
      expect(updated.description).toBe("Descripción Nueva");
    });

    test("debe actualizar el estado de completada", () => {
      TaskManager.createTask("Tarea");
      const updated = TaskManager.updateTask(1, undefined, undefined, true);
      
      expect(updated.completed).toBe(true);
    });

    test("debe retornar null si la tarea no existe", () => {
      const result = TaskManager.updateTask(999, "Nuevo Título");
      expect(result).toBeNull();
    });

    test("debe actualizar múltiples campos", () => {
      TaskManager.createTask("Original", "Descripción Original");
      const updated = TaskManager.updateTask(1, "Nuevo", "Nueva Descripción", true);
      
      expect(updated.title).toBe("Nuevo");
      expect(updated.description).toBe("Nueva Descripción");
      expect(updated.completed).toBe(true);
    });
  });

  describe("Eliminar Tareas", () => {
    test("debe eliminar una tarea existente", () => {
      TaskManager.createTask("Tarea a Eliminar");
      const result = TaskManager.deleteTask(1);
      
      expect(result).toBe(true);
      expect(TaskManager.getTasks().length).toBe(0);
    });

    test("debe retornar false al intentar eliminar tarea inexistente", () => {
      const result = TaskManager.deleteTask(999);
      expect(result).toBe(false);
    });

    test("debe eliminar solo la tarea especificada", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.createTask("Tarea 2");
      TaskManager.createTask("Tarea 3");
      
      TaskManager.deleteTask(2);
      
      const tasks = TaskManager.getTasks();
      expect(tasks.length).toBe(2);
      expect(tasks.find(t => t.id === 2)).toBeUndefined();
      expect(tasks.find(t => t.id === 1)).toBeDefined();
      expect(tasks.find(t => t.id === 3)).toBeDefined();
    });
  });

  describe("Filtrar por Estado", () => {
    test("debe retornar solo tareas completadas", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.createTask("Tarea 2");
      TaskManager.createTask("Tarea 3");
      
      TaskManager.updateTask(1, undefined, undefined, true);
      TaskManager.updateTask(2, undefined, undefined, true);
      
      const completed = TaskManager.getTasksByStatus(true);
      expect(completed.length).toBe(2);
      expect(completed.every(t => t.completed)).toBe(true);
    });

    test("debe retornar solo tareas pendientes", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.createTask("Tarea 2");
      
      TaskManager.updateTask(1, undefined, undefined, true);
      
      const pending = TaskManager.getTasksByStatus(false);
      expect(pending.length).toBe(1);
      expect(pending[0].completed).toBe(false);
    });
  });

  describe("Estadísticas", () => {
    test("debe contar el total de tareas", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.createTask("Tarea 2");
      TaskManager.createTask("Tarea 3");
      
      expect(TaskManager.getTotalTasks()).toBe(3);
    });

    test("debe contar tareas completadas", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.createTask("Tarea 2");
      TaskManager.createTask("Tarea 3");
      
      TaskManager.updateTask(1, undefined, undefined, true);
      
      expect(TaskManager.getCompletedCount()).toBe(1);
    });

    test("debe contar tareas pendientes", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.createTask("Tarea 2");
      TaskManager.createTask("Tarea 3");
      
      TaskManager.updateTask(1, undefined, undefined, true);
      
      expect(TaskManager.getPendingCount()).toBe(2);
    });
  });

  describe("Reiniciar Estado", () => {
    test("debe limpiar todas las tareas", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.createTask("Tarea 2");
      
      TaskManager.resetTasks();
      
      expect(TaskManager.getTasks().length).toBe(0);
    });

    test("debe resetear el contador de IDs", () => {
      TaskManager.createTask("Tarea 1");
      TaskManager.resetTasks();
      
      const newTask = TaskManager.createTask("Nueva Tarea");
      expect(newTask.id).toBe(1);
    });
  });
});

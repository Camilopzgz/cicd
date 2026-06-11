// Pruebas de integración para las rutas de la API
const request = require("supertest");
const app = require("../app");
const TaskManager = require("../taskManager");

describe("API REST - Rutas de Tareas", () => {
  
  beforeEach(() => {
    TaskManager.resetTasks();
  });

  describe("GET /", () => {
    test("debe retornar mensaje de bienvenida", async () => {
      const response = await request(app).get("/");
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("DevOps Lab Running");
      expect(response.body.version).toBe("1.0.0");
    });
  });

  describe("GET /health", () => {
    test("debe retornar estado OK", async () => {
      const response = await request(app).get("/health");
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("OK");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("POST /tasks", () => {
    test("debe crear una tarea con título y descripción", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({
          title: "Aprender Docker",
          description: "Completar el módulo Docker"
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe("Aprender Docker");
      expect(response.body.description).toBe("Completar el módulo Docker");
      expect(response.body.completed).toBe(false);
    });

    test("debe rechazar tarea sin título", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({ description: "Sin título" });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("debe rechazar título vacío", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({ title: "   " });
      
      expect(response.status).toBe(400);
    });

    test("debe rechazar título demasiado largo", async () => {
      const longTitle = "a".repeat(101);
      const response = await request(app)
        .post("/tasks")
        .send({ title: longTitle });
      
      expect(response.status).toBe(400);
    });

    test("debe rechazar descripción demasiado larga", async () => {
      const longDescription = "a".repeat(501);
      const response = await request(app)
        .post("/tasks")
        .send({
          title: "Título válido",
          description: longDescription
        });
      
      expect(response.status).toBe(400);
    });

    test("debe rechazar título no-texto", async () => {
      const response = await request(app)
        .post("/tasks")
        .send({ title: 123 });
      
      expect(response.status).toBe(400);
    });
  });

  describe("GET /tasks", () => {
    test("debe retornar lista vacía inicialmente", async () => {
      const response = await request(app).get("/tasks");
      
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
      expect(response.body.tasks).toEqual([]);
    });

    test("debe retornar todas las tareas creadas", async () => {
      await request(app)
        .post("/tasks")
        .send({ title: "Tarea 1" });
      
      await request(app)
        .post("/tasks")
        .send({ title: "Tarea 2" });
      
      const response = await request(app).get("/tasks");
      
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(response.body.tasks.length).toBe(2);
    });
  });

  describe("GET /tasks/:id", () => {
    test("debe retornar tarea por ID", async () => {
      await request(app)
        .post("/tasks")
        .send({ title: "Tarea Especial" });
      
      const response = await request(app).get("/tasks/1");
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.title).toBe("Tarea Especial");
    });

    test("debe retornar 404 para ID inexistente", async () => {
      const response = await request(app).get("/tasks/999");
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /tasks/:id", () => {
    test("debe actualizar una tarea", async () => {
      await request(app)
        .post("/tasks")
        .send({ title: "Tarea Original" });
      
      const response = await request(app)
        .put("/tasks/1")
        .send({ title: "Tarea Actualizada" });
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Tarea Actualizada");
    });

    test("debe marcar tarea como completada", async () => {
      await request(app)
        .post("/tasks")
        .send({ title: "Tarea a Completar" });
      
      const response = await request(app)
        .put("/tasks/1")
        .send({ 
          title: "Tarea a Completar",
          completed: true 
        });
      
      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(true);
    });

    test("debe retornar 404 para ID inexistente", async () => {
      const response = await request(app)
        .put("/tasks/999")
        .send({ title: "Nuevo Título" });
      
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /tasks/:id", () => {
    test("debe eliminar una tarea", async () => {
      await request(app)
        .post("/tasks")
        .send({ title: "Tarea a Eliminar" });
      
      const response = await request(app).delete("/tasks/1");
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      
      // Verificar que fue eliminada
      const getResponse = await request(app).get("/tasks/1");
      expect(getResponse.status).toBe(404);
    });

    test("debe retornar 404 para ID inexistente", async () => {
      const response = await request(app).delete("/tasks/999");
      
      expect(response.status).toBe(404);
    });
  });

  describe("GET /tasks/status/:status", () => {
    test("debe retornar tareas completadas", async () => {
      await request(app).post("/tasks").send({ title: "Tarea 1" });
      await request(app).post("/tasks").send({ title: "Tarea 2" });
      
      await request(app)
        .put("/tasks/1")
        .send({ title: "Tarea 1", completed: true });
      
      const response = await request(app).get("/tasks/status/completed");
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("completed");
      expect(response.body.total).toBe(1);
    });

    test("debe retornar tareas pendientes", async () => {
      await request(app).post("/tasks").send({ title: "Tarea 1" });
      await request(app).post("/tasks").send({ title: "Tarea 2" });
      
      await request(app)
        .put("/tasks/1")
        .send({ title: "Tarea 1", completed: true });
      
      const response = await request(app).get("/tasks/status/pending");
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("pending");
      expect(response.body.total).toBe(1);
    });

    test("debe rechazar estado inválido", async () => {
      const response = await request(app).get("/tasks/status/invalido");
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /stats", () => {
    test("debe retornar estadísticas vacías inicialmente", async () => {
      const response = await request(app).get("/stats");
      
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
      expect(response.body.completed).toBe(0);
      expect(response.body.pending).toBe(0);
    });

    test("debe retornar estadísticas correctas", async () => {
      await request(app).post("/tasks").send({ title: "Tarea 1" });
      await request(app).post("/tasks").send({ title: "Tarea 2" });
      await request(app).post("/tasks").send({ title: "Tarea 3" });
      
      await request(app)
        .put("/tasks/1")
        .send({ title: "Tarea 1", completed: true });
      
      const response = await request(app).get("/stats");
      
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
      expect(response.body.completed).toBe(1);
      expect(response.body.pending).toBe(2);
    });
  });
});

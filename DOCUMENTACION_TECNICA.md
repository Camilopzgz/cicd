# Documentación técnica — DevOps Lab

Versión: 1.0.0
Repositorio: https://github.com/Camilopzgz/cicd

---

## Tabla de contenidos

1. [Descripción general](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Componentes de la aplicación](#componentes-de-la-aplicación)
4. [Pipelines CI/CD](#pipelines-cicd)
5. [Estrategia de testing](#estrategia-de-testing)
6. [Docker](#docker)
7. [Kubernetes](#kubernetes)
8. [API Reference](#api-reference)
9. [Seguridad](#seguridad)
10. [Troubleshooting](#troubleshooting)

---

## Descripción general

DevOps Lab es una API REST construida con Node.js y Express que gestiona una lista de tareas en memoria. Su propósito principal es demostrar un flujo CI/CD completo con pruebas automatizadas, análisis de calidad de código, construcción de imagen Docker y publicación en un registry privado.

El proyecto implementa:

- Separación de responsabilidades entre capa HTTP (`app.js`), lógica de negocio (`taskManager.js`) y validación de entrada (`validators.js`)
- Tests unitarios y de integración con Jest y Supertest
- Cobertura de código con threshold mínimo del 70%, actualmente por encima del 97%
- Pipeline CI automático con GitHub Actions
- Pipeline CD opcional con Jenkins
- Imagen Docker publicada en GitHub Container Registry
- Manifiestos Kubernetes como punto de partida para despliegue

---

## Arquitectura

```
Cliente HTTP
    |
    v
Express (app.js)
    |
    |-- GET /               Información del servicio
    |-- GET /health         Estado del servidor
    |-- POST /tasks         Crear tarea  --> validateTask middleware
    |-- GET /tasks          Listar tareas
    |-- GET /tasks/:id      Obtener tarea por ID
    |-- PUT /tasks/:id      Actualizar tarea  --> validateTask middleware
    |-- DELETE /tasks/:id   Eliminar tarea
    |-- GET /tasks/status/:status   Filtrar por estado
    |-- GET /stats          Estadísticas
    |
    v
TaskManager (taskManager.js)
    |
    v
Array en memoria (tasks[])
```

El flujo de una petición con body pasa por el middleware `validateTask` antes de llegar al handler. Si la validación falla, responde con 400 sin llegar a la capa de lógica de negocio.

### Flujo CI/CD completo

```
Desarrollo local
    |
    | git push origin develop
    v
GitHub Actions (ci.yml)
    |
    |-- Validar estructura
    |-- Validar sintaxis
    |-- npm ci
    |-- npm audit
    |-- npm test (cobertura >= 70%)
    |-- Codecov upload
    |-- Verificar startup
    v
Artefactos: reporte de cobertura, imagen Docker en GHCR
    |
    v
Jenkins (opcional, manual)
    |
    |-- Clone
    |-- Build imagen
    |-- Test imagen (curl /health)
    |-- Push a GHCR
    |-- Cleanup
    v
ghcr.io/Camilopzgz/devops-lab:{BUILD_NUMBER} y :latest
```

---

## Componentes de la aplicación

### server.js

Punto de entrada. Importa la aplicación Express y arranca el servidor HTTP en el puerto 3000.

```javascript
const app = require("./app");
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});
```

No exporta nada; es el único archivo excluido del reporte de cobertura porque no tiene lógica propia que testear.

### app.js

Configura Express, registra el middleware de parseo JSON, define todas las rutas y exporta la instancia para los tests.

Estructura general:

```javascript
const express = require("express");
const TaskManager = require("./taskManager");
const { validateTask } = require("./validators");

const app = express();
app.use(express.json());

// rutas...

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;
```

El middleware de error al final captura cualquier excepción no controlada y responde con 500.

### taskManager.js

Contiene la clase `TaskManager` con métodos estáticos y un array `tasks` en el módulo como almacenamiento en memoria.

Métodos disponibles:

| Método | Descripción |
|---|---|
| `createTask(title, description)` | Crea tarea con ID autoincremental, trimea strings |
| `getTasks()` | Retorna todos los elementos del array |
| `getTaskById(id)` | Busca por ID con `parseInt`, retorna `undefined` si no existe |
| `updateTask(id, title, description, completed)` | Actualización parcial; solo modifica campos no undefined |
| `deleteTask(id)` | Elimina por índice, retorna `true` o `false` |
| `getTasksByStatus(completed)` | Filtra por booleano |
| `getTotalTasks()` | Longitud del array |
| `getCompletedCount()` | Conteo de tareas con `completed === true` |
| `getPendingCount()` | Conteo de tareas con `completed === false` |
| `resetTasks()` | Vacía el array y reinicia el contador de IDs (usado en tests) |

Estructura de una tarea:

```json
{
  "id": 1,
  "title": "Título de la tarea",
  "description": "Descripción opcional",
  "completed": false,
  "createdAt": "2026-06-10T12:00:00.000Z"
}
```

### validators.js

Middleware Express que valida el body antes de llegar al handler.

Reglas aplicadas:

- `title` es obligatorio, debe ser string no vacío (tras trim)
- `title` no puede exceder 100 caracteres
- `description`, si se proporciona, no puede exceder 500 caracteres

```javascript
const validateTask = (req, res, next) => {
  const { title, description } = req.body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "El título es requerido y debe ser texto" });
  }
  if (title.length > 100) {
    return res.status(400).json({ error: "El título no debe exceder 100 caracteres" });
  }
  if (description && description.length > 500) {
    return res.status(400).json({ error: "La descripción no debe exceder 500 caracteres" });
  }

  next();
};
```

---

## Pipelines CI/CD

### GitHub Actions — ci.yml

Archivo: `.github/workflows/ci.yml`

Trigger: push o pull request a `main` o `develop`.

El job `validate-and-test` corre en `ubuntu-latest` y ejecuta estos pasos en orden:

1. `actions/checkout@v4` — descarga el código
2. `actions/setup-node@v4` con Node.js 18.x y caché npm
3. Verificación de estructura: `test -f app.js`, `test -f taskManager.js`, `test -f validators.js`, `test -f server.js`, `test -f package.json`, `test -d __tests__`
4. Validación de sintaxis: `node -c` sobre cada archivo JS
5. `npm ci` — instalación reproducible
6. `npm audit --audit-level=high || true` — no bloquea el build por alertas de baja severidad
7. `npm test` — ejecuta Jest con cobertura; falla si threshold no se alcanza
8. `codecov/codecov-action@v4` — sube el reporte de cobertura
9. `timeout 10s node server.js` — el proceso que termina por timeout (exit 124) se considera correcto; cualquier otro código de error falla el step

### Jenkins — Jenkinsfile

Pipeline declarativo con 6 stages para el flujo de entrega continua.

```
options:
  timeout: 30 minutos
  timestamps: habilitado
  buildDiscarder: últimos 10 builds

environment:
  REGISTRY       = ghcr.io
  IMAGE_NAME     = ghcr.io/{GIT_REPOSITORY_OWNER}/devops-lab
  IMAGE_TAG      = {BUILD_NUMBER}
  DOCKERFILE_PATH = ./Dockerfile
```

Stages:

| Stage | Detalle |
|---|---|
| Clone Repository | `git clone`, imprime SHA corto y nombre de rama |
| Build Docker Image | `docker build` con dos tags: `BUILD_NUMBER` y `latest`; añade labels `build.number`, `git.commit`, `git.branch` |
| Test Docker Image | `docker run -d -p 3000:3000`, `sleep 3`, `curl -f /` y `curl -f /health`; detiene y elimina el contenedor al terminar |
| Authenticate Docker Registry | `echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin` |
| Push Docker Image | `docker push` de ambas etiquetas, imprime los comandos para descargar la imagen |
| Cleanup | `docker logout ghcr.io` |

El bloque `post` registra resultado, número de build y duración independientemente del outcome.

---

## Estrategia de testing

### Tests unitarios — taskManager.test.js

30 tests organizados en 7 suites:

| Suite | Tests |
|---|---|
| Crear Tareas | 4 (título+descripción, solo título, IDs secuenciales, trim) |
| Obtener Tareas | 4 (lista vacía, todas las tareas, por ID, ID inexistente) |
| Actualizar Tareas | 5 (título, descripción, estado, null en inexistente, múltiples campos) |
| Eliminar Tareas | 3 (existente, inexistente, solo la indicada) |
| Filtrar por Estado | 2 (completadas, pendientes) |
| Estadísticas | 3 (total, completadas, pendientes) |
| Reiniciar Estado | 2 (limpiar tasks, resetear IDs) |

Todos los tests llaman a `TaskManager.resetTasks()` en `beforeEach` para garantizar aislamiento.

### Tests de integración — app.test.js

28 tests que cubren todos los endpoints mediante peticiones HTTP reales con Supertest:

| Suite | Endpoints cubiertos |
|---|---|
| GET / | Mensaje de bienvenida y versión |
| GET /health | Status OK y timestamp |
| POST /tasks | Creación, validación de título, trim, límites de caracteres |
| GET /tasks | Lista vacía, múltiples tareas con campo `total` |
| GET /tasks/:id | Tarea existente, 404 |
| PUT /tasks/:id | Actualización, completar tarea, 404 |
| DELETE /tasks/:id | Eliminación, verificación posterior, 404 |
| GET /tasks/status/:status | Completadas, pendientes, estado inválido |
| GET /stats | Vacío, estadísticas correctas |

### Cobertura

| Archivo | Tests | Cobertura |
|---|---|---|
| taskManager.js | 30 | 100% |
| app.js | 28 | ~96% |
| validators.js | incluido en app.test.js | 100% |
| Total | 58 | >97% |

Threshold configurado en `jest.config.js`: 70% en statements, branches, lines y functions.

---

## Docker

### Construcción

```bash
docker build -t devops-lab:local .
docker run -p 3000:3000 devops-lab:local
```

### Estructura del Dockerfile

```dockerfile
FROM node:18-alpine          # base mínima Alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production  # solo dependencias runtime
COPY . .
EXPOSE 3000
HEALTHCHECK ...              # verifica /health cada 30s
USER node                    # usuario sin privilegios
CMD ["node", "server.js"]
```

### HEALTHCHECK

```
Intervalo:     30 segundos
Timeout:       10 segundos
Start period:  5 segundos (margen para el arranque)
Retries:       3
Comando:       node -e "require('http').get('http://localhost:3000/health', ...)"
```

### Imagen en GHCR

```bash
# Descargar
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
docker pull ghcr.io/Camilopzgz/devops-lab:latest

# Ejecutar
docker run -p 3000:3000 ghcr.io/Camilopzgz/devops-lab:latest
```

Cada ejecución del pipeline de Jenkins publica dos tags: el número de build y `latest`.

---

## Kubernetes

Los manifiestos en `k8s/` son configuraciones base. No incluyen probes de liveness/readiness ni resource limits; deben adaptarse antes de usar en producción.

### deployment.yaml

- 2 replicas
- Imagen: `tuusuario/devops-lab:latest` — reemplazar con la URL real de GHCR
- Puerto del contenedor: 3000

### service.yaml

- Tipo: NodePort
- Puerto externo: 80
- Puerto interno (targetPort): 3000

```bash
# Actualizar la imagen antes de aplicar
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Verificar estado
kubectl get pods
kubectl get services
```

---

## API Reference

### GET /

```
200 OK
{ "message": "DevOps Lab Running", "version": "1.0.0" }
```

### GET /health

```
200 OK
{ "status": "OK", "timestamp": "2026-06-10T12:00:00.000Z" }
```

### GET /tasks

```
200 OK
{ "total": 2, "tasks": [ { id, title, description, completed, createdAt }, ... ] }
```

### POST /tasks

Request body:

```json
{ "title": "string (requerido, max 100)", "description": "string (opcional, max 500)" }
```

Respuestas:

```
201 Created   { id, title, description, completed, createdAt }
400 Bad Request   { "error": "El título es requerido y debe ser texto" }
400 Bad Request   { "error": "El título no debe exceder 100 caracteres" }
400 Bad Request   { "error": "La descripción no debe exceder 500 caracteres" }
```

### GET /tasks/:id

```
200 OK    { id, title, description, completed, createdAt }
404 Not Found   { "error": "Tarea no encontrada" }
```

### PUT /tasks/:id

Request body (todos los campos son opcionales):

```json
{ "title": "string", "description": "string", "completed": true }
```

Respuestas:

```
200 OK    tarea actualizada
404 Not Found   { "error": "Tarea no encontrada" }
400 Bad Request   si el body incluye title pero no pasa validación
```

### DELETE /tasks/:id

```
200 OK    { "message": "Tarea eliminada correctamente" }
404 Not Found   { "error": "Tarea no encontrada" }
```

### GET /tasks/status/:status

Valores válidos: `completed`, `pending`.

```
200 OK    { "status": "pending", "total": 1, "tasks": [...] }
400 Bad Request   { "error": "Estado inválido. Use 'completed' o 'pending'" }
```

### GET /stats

```
200 OK
{ "total": 3, "completed": 1, "pending": 2 }
```

---

## Seguridad

### Imagen Docker

- Base Alpine minimiza la superficie de ataque
- `npm install --production` evita instalar herramientas de build en la imagen final
- El proceso corre como usuario `node`, no como root
- El HEALTHCHECK permite que el orquestador reinicie el contenedor si deja de responder

### Credenciales

- GitHub Actions usa `GITHUB_TOKEN` efímero generado por la plataforma; no requiere configuración manual
- Jenkins requiere credenciales configuradas como secrets, nunca en el Jenkinsfile
- El `sonar.login` en `sonar-project.properties` debe moverse a variable de entorno o credencial de CI; no debe quedar en el repositorio con valor real

### Validación de entrada

- El middleware `validateTask` verifica tipo, presencia y longitud antes de que el dato llegue a la lógica de negocio
- Los IDs se parsean con `parseInt` para evitar comparaciones de tipo incorrecto

### Dependencias

- `npm audit` se ejecuta en cada build de CI
- El nivel de alerta está configurado en `--audit-level=high` para no bloquear builds por vulnerabilidades de baja severidad que no tienen fix disponible

---

## Troubleshooting

### Los tests fallan por cobertura

El threshold está en 70%. Si la cobertura cae por debajo, `npm test` retorna un código de error diferente de 0.

```bash
# Ejecutar localmente para ver el detalle
npm test

# Identificar las líneas no cubiertas en el reporte
open coverage/lcov-report/index.html
```

### Error de autenticación en Jenkins

```
ERROR: unauthorized: unauthenticated
```

Verificar que las credenciales `GITHUB_USERNAME` y `GITHUB_TOKEN` existen en Jenkins con exactamente esos IDs. El token debe tener los scopes `read:packages` y `write:packages`.

### La imagen Docker no arranca

```bash
# Ver logs del contenedor
docker logs <container_id>

# Ejecutar con shell para inspeccionar
docker run -it --entrypoint sh devops-lab:local
```

El HEALTHCHECK tarda 5 segundos en el primer ciclo. Si el contenedor aparece como `unhealthy`, revisar que el endpoint `/health` responde con status 200.

### El pipeline de GitHub Actions timeout en el step de startup

El step usa `timeout 10s node server.js`. Si el servidor demora en arrancar, el timeout puede ser insuficiente. El código de salida 124 (timeout) es tratado como éxito; cualquier otro código diferente de 0 falla el step. Si falla, revisar que no haya errores de sintaxis o módulos faltantes.

### SonarQube no analiza el proyecto

Verificar que `sonar.host.url` apunta a una instancia activa y que el token de autenticación es válido. Para análisis local:

```bash
npx sonarqube-scanner
```

---

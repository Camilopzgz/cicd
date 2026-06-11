# DevOps Lab - CI/CD Pipeline

Aplicación Node.js con pipeline CI/CD automatizado usando GitHub Actions y Jenkins. Incluye tests unitarios, tests de integración, cobertura de código, construcción de imagen Docker y publicación en GitHub Container Registry.

## Tabla de contenidos

- [Estructura del proyecto](#estructura-del-proyecto)
- [Tecnologías](#tecnologías)
- [Flujo CI/CD](#flujo-cicd)
- [Ejecución local](#ejecución-local)
- [Pipeline GitHub Actions](#pipeline-github-actions)
- [Pipeline Jenkins](#pipeline-jenkins)
- [API REST](#api-rest)
- [Tests y cobertura](#tests-y-cobertura)
- [Docker](#docker)
- [Kubernetes](#kubernetes)
- [Credenciales requeridas](#credenciales-requeridas)

## Estructura del proyecto

```
.
├── app.js                        # Servidor Express con rutas y middleware
├── taskManager.js                # Lógica de negocio (gestión de tareas)
├── validators.js                 # Middleware de validación de entrada
├── server.js                     # Punto de entrada, inicia el servidor
├── package.json                  # Dependencias y scripts NPM
├── jest.config.js                # Configuración Jest (tests y cobertura)
├── Dockerfile                    # Imagen Docker de producción
├── Jenkinsfile                   # Pipeline CD con Jenkins (6 stages)
├── sonar-project.properties      # Configuración SonarQube
├── .github/
│   └── workflows/
│       └── ci.yml                # Pipeline CI (tests, validación, Docker)
├── __tests__/
│   ├── app.test.js               # Tests de integración (API endpoints)
│   └── taskManager.test.js       # Tests unitarios (lógica de negocio)
└── k8s/
    ├── deployment.yaml           # Deployment Kubernetes (2 replicas)
    └── service.yaml              # Service Kubernetes (NodePort)
```

## Tecnologías

| Componente | Versión | Propósito |
|---|---|---|
| Node.js | 18.x | Runtime |
| Express | 5.2.1 | Framework web |
| Jest | 29.7.0 | Testing |
| Supertest | 6.3.4 | Tests HTTP |
| Docker | latest | Containerización |
| GitHub Actions | native | CI/CD |
| Jenkins | 2.x | CD adicional |
| SonarQube | compatible | Análisis de calidad |

## Flujo CI/CD

El flujo completo parte de un push al repositorio y termina con una imagen publicada en GitHub Container Registry.

```
Desarrollo local
    |
    | git push origin develop
    v
GitHub Actions (ci.yml)
    |
    |-- Validar estructura del proyecto
    |-- Validar sintaxis JavaScript
    |-- npm ci (instalar dependencias)
    |-- npm audit (seguridad)
    |-- npm test (tests + cobertura >= 70%)
    |-- Subir reporte a Codecov
    |-- Build imagen Docker
    |-- Push imagen a GHCR
    |
    v
Imagen disponible en ghcr.io/Camilopzgz/devops-lab
    |
    v
Jenkins (opcional, ejecutado manualmente)
    |
    |-- Clone Repository
    |-- Build Docker Image
    |-- Test Docker Image (curl /health, curl /)
    |-- Authenticate Registry
    |-- Push Docker Image
    |-- Cleanup
    |
    v
Imagen publicada en GHCR con BUILD_NUMBER y latest
```

El pipeline de GitHub Actions es el flujo principal y se ejecuta automáticamente en cada push. Jenkins complementa el proceso como pipeline de entrega continua adicional con prueba funcional del contenedor antes de publicar.

## Ejecución local

### Requisitos

- Node.js 18.x
- npm 9.x o superior
- Docker (opcional)

### Instalación y uso

```bash
# Clonar repositorio
git clone https://github.com/Camilopzgz/cicd.git
cd cicd

# Instalar dependencias
npm install

# Ejecutar tests con cobertura
npm test

# Iniciar servidor (puerto 3000)
npm start
```

### Ejemplos de endpoints

```bash
# Raíz
curl http://localhost:3000/

# Health check
curl http://localhost:3000/health

# Listar tareas
curl http://localhost:3000/tasks

# Crear tarea
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Mi tarea","description":"Descripción"}'

# Tareas por estado
curl http://localhost:3000/tasks/status/pending
curl http://localhost:3000/tasks/status/completed

# Estadísticas
curl http://localhost:3000/stats
```

## Pipeline GitHub Actions

Archivo: `.github/workflows/ci.yml`

Se activa en push o pull request a las ramas `main` y `develop`.

### Pasos del pipeline

1. Checkout del código
2. Configurar Node.js 18.x con caché de npm
3. Validar que los archivos requeridos existen (`app.js`, `taskManager.js`, `validators.js`, `server.js`, `package.json`, `__tests__/`)
4. Validar sintaxis JavaScript con `node -c`
5. `npm ci` para instalar dependencias de forma reproducible
6. `npm audit --audit-level=high` para detectar vulnerabilidades (no bloquea el build si hay advertencias menores)
7. `npm test` ejecuta Jest con cobertura, falla si cae por debajo del 70%
8. Subir reporte `lcov.info` a Codecov
9. Verificar que el servidor arranca correctamente con `timeout 10s node server.js`

### Cobertura actual

| Archivo | Tests | Cobertura |
|---|---|---|
| taskManager.test.js | 30 | 100% |
| app.test.js | 28 | ~96% |
| Total | 58 | >97% |

## Pipeline Jenkins

Archivo: `Jenkinsfile`

Pipeline de entrega continua que construye, prueba y publica la imagen Docker. Se ejecuta manualmente o desde un job configurado en el servidor Jenkins.

### Configuracion

| Opción | Valor |
|---|---|
| Timeout | 30 minutos |
| Timestamps | habilitados |
| Build history | últimos 10 builds |

### Variables de entorno

```
REGISTRY      = ghcr.io
IMAGE_NAME    = ghcr.io/{GIT_REPOSITORY_OWNER}/devops-lab
IMAGE_TAG     = {BUILD_NUMBER}
```

### 6 stages

1. Clone Repository — clona `https://github.com/Camilopzgz/cicd.git` y muestra commit y branch
2. Build Docker Image — construye la imagen con tags `BUILD_NUMBER` y `latest`, añade labels de commit y branch
3. Test Docker Image — levanta el contenedor, espera 3 segundos y verifica respuesta en `/` y `/health`
4. Authenticate Docker Registry — login en `ghcr.io` con `GITHUB_USERNAME` y `GITHUB_TOKEN`
5. Push Docker Image — publica las dos etiquetas en GHCR
6. Cleanup — logout del registry

### Credenciales requeridas en Jenkins

Crear como credenciales de tipo "Secret text" o "Username with password":

```
GITHUB_USERNAME   tu usuario de GitHub
GITHUB_TOKEN      token con scopes read:packages y write:packages
```

## API REST

### GET /

```json
{ "message": "DevOps Lab Running", "version": "1.0.0" }
```

### GET /health

```json
{ "status": "OK", "timestamp": "2026-06-10T..." }
```

### GET /tasks

```json
{ "total": 2, "tasks": [...] }
```

### POST /tasks

Body: `{ "title": "string (max 100)", "description": "string opcional (max 500)" }`

Respuesta 201 con la tarea creada, o 400 si la validación falla.

### GET /tasks/:id

200 con la tarea, o 404 si no existe.

### PUT /tasks/:id

Body: `{ "title", "description", "completed" }` — todos opcionales.

200 con la tarea actualizada, o 404 si no existe.

### DELETE /tasks/:id

```json
{ "message": "Tarea eliminada correctamente" }
```

200 al eliminar, 404 si no existe.

### GET /tasks/status/:status

Valores válidos: `completed`, `pending`.

```json
{ "status": "pending", "total": 1, "tasks": [...] }
```

400 si el estado no es válido.

### GET /stats

```json
{ "total": 3, "completed": 1, "pending": 2 }
```

## Tests y cobertura

```bash
# Ejecutar tests con reporte de cobertura
npm test

# Modo watch para desarrollo
npm run test:watch
```

El threshold de cobertura está configurado en `jest.config.js` al 70% en statements, branches, lines y functions. Si la cobertura cae por debajo, el comando falla y el pipeline de CI también.

Los reportes de cobertura se generan en `coverage/lcov.info` y se suben automáticamente a Codecov desde el pipeline de GitHub Actions.

## Docker

```bash
# Build local
docker build -t devops-lab:local .

# Ejecutar
docker run -p 3000:3000 devops-lab:local

# Descargar desde GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
docker pull ghcr.io/Camilopzgz/devops-lab:latest
docker run -p 3000:3000 ghcr.io/Camilopzgz/devops-lab:latest
```

El Dockerfile usa `node:18-alpine` como base, instala solo dependencias de producción, configura un HEALTHCHECK sobre `/health` cada 30 segundos y corre el proceso como el usuario `node` (no root).

Ver las imágenes publicadas en: `https://github.com/Camilopzgz/cicd/pkgs/container/devops-lab`

## Kubernetes

Los manifiestos en `k8s/` están pensados como punto de partida para un despliegue en un clúster existente.

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

- `deployment.yaml` — 2 replicas, imagen `tuusuario/devops-lab:latest`, puerto 3000
- `service.yaml` — tipo NodePort, mapea puerto externo 80 al interno 3000

Antes de aplicar, actualizar el campo `image` en `deployment.yaml` con la URL real de la imagen en GHCR.

## Credenciales requeridas

### GitHub Actions

El pipeline usa el `GITHUB_TOKEN` generado automáticamente por GitHub Actions. No requiere configuración adicional para publicar en GHCR dentro del mismo repositorio.

### Jenkins

1. Ir a Jenkins > Manage Jenkins > Credentials
2. Crear credencial tipo "Secret text":
   - ID: `GITHUB_USERNAME` — tu usuario de GitHub
   - ID: `GITHUB_TOKEN` — personal access token con scopes `read:packages` y `write:packages`
3. Generar el token en GitHub > Settings > Developer settings > Personal access tokens > Generate new token (classic)

---

Repositorio: https://github.com/Camilopzgz/cicd  
Rama principal: `main` | Rama de desarrollo: `develop`

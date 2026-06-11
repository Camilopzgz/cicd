# Archivos de configuración

Este documento describe todos los archivos de configuración incluidos en el repositorio y su propósito dentro del pipeline CI/CD.

## Índice

- [package.json](#packagejson)
- [jest.config.js](#jestconfigjs)
- [sonar-project.properties](#sonar-projectproperties)
- [Dockerfile](#dockerfile)
- [Jenkinsfile](#jenkinsfile)
- [GitHub Actions — ci.yml](#github-actions--ciyml)
- [Kubernetes](#kubernetes)
- [Variables de entorno](#variables-de-entorno)

---

## package.json

Gestión de dependencias y scripts del proyecto.

```json
{
  "name": "evops-lab",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^5.2.1"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "sonarqube-scanner": "^4.3.6",
    "supertest": "^6.3.4"
  }
}
```

Scripts disponibles:

| Script | Comando | Descripción |
|---|---|---|
| start | `node server.js` | Inicia el servidor en puerto 3000 |
| test | `jest --coverage` | Ejecuta tests y genera reporte de cobertura |
| test:watch | `jest --watch` | Tests en modo watch para desarrollo |

---

## jest.config.js

Configuración del framework de testing Jest.

```javascript
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!server.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: ['**/__tests__/**/*.test.js']
};
```

Puntos clave:

- Ambiente de ejecución: Node.js
- Cobertura recolectada de todos los `.js` en la raíz, excluyendo `jest.config.js` y `server.js`
- Threshold global del 70% en las cuatro métricas; si no se alcanza, el comando `npm test` retorna código de error y el pipeline de CI falla
- Solo ejecuta archivos con extensión `.test.js` dentro de `__tests__/`

---

## sonar-project.properties

Configuración para análisis estático con SonarQube.

```properties
sonar.projectKey=express-api
sonar.projectName=Express API
sonar.projectVersion=1.0

sonar.sources=.
sonar.host.url=http://localhost:9000

sonar.exclusions=node_modules/**,.vscode/**,coverage/**,k8s/**
```

El `sonar.login` debe configurarse como variable de entorno o credencial en el sistema de CI, no debe quedar expuesto en el repositorio.

Para ejecutar el análisis localmente:

```bash
npx sonarqube-scanner
```

---

## .dockerignore

Excluye archivos y carpetas que no deben copiarse a la imagen Docker. Reduce el tamaño del contexto de build y evita incluir archivos sensibles o innecesarios.

```
node_modules
npm-debug.log
coverage
.nyc_output
__tests__
.git
.gitignore
.github
.vscode
.scannerwork
*.md
jest.config.js
Jenkinsfile
sonar-project.properties
k8s
```

- `node_modules` — se reinstala dentro de la imagen con `npm install --production`
- `coverage` y `__tests__` — no son necesarios en runtime
- `.git` y `.github` — metadatos del repositorio, no pertenecen a la imagen
- `*.md`, `Jenkinsfile`, `sonar-project.properties` — documentación y configs de CI que no usa la app
- `k8s` — manifiestos de Kubernetes, no forman parte del contenedor

---

## Dockerfile

Imagen Docker de producción basada en `node:18-alpine`.

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

USER node

CMD ["node", "server.js"]
```

Decisiones de diseño:

| Decisión | Razón |
|---|---|
| `node:18-alpine` | Imagen base ligera (~180MB vs ~900MB en debian) |
| `npm install --production` | Solo instala dependencias de producción, no devDependencies |
| `USER node` | El proceso corre con usuario sin privilegios |
| `HEALTHCHECK` | Permite al orquestador (Docker, Kubernetes) detectar cuando la app no responde |
| `COPY package*.json` antes del código | Aprovecha el caché de capas; si el código cambia pero no las deps, no reinstala |

Build y ejecución local:

```bash
docker build -t devops-lab:local .
docker run -p 3000:3000 devops-lab:local
```

---

## Jenkinsfile

Pipeline declarativo de Jenkins con 6 stages para construir, probar y publicar la imagen Docker.

```groovy
pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        REGISTRY      = 'ghcr.io'
        IMAGE_NAME    = "${REGISTRY}/${GIT_REPOSITORY_OWNER}/devops-lab"
        IMAGE_TAG     = "${BUILD_NUMBER}"
        DOCKERFILE_PATH = './Dockerfile'
    }

    stages {
        stage('Clone Repository')          { ... }
        stage('Build Docker Image')        { ... }
        stage('Test Docker Image')         { ... }
        stage('Authenticate Docker Registry') { ... }
        stage('Push Docker Image')         { ... }
        stage('Cleanup')                   { ... }
    }

    post {
        success { ... }
        failure { ... }
        always  { ... }
    }
}
```

Descripción de los stages:

| Stage | Acción |
|---|---|
| Clone Repository | `git clone` del repositorio, imprime commit y branch |
| Build Docker Image | `docker build` con tags `BUILD_NUMBER` y `latest`, labels de git |
| Test Docker Image | Levanta el contenedor, espera 3s, verifica `/` y `/health` con `curl -f` |
| Authenticate Docker Registry | `docker login ghcr.io` con credenciales `GITHUB_USERNAME` y `GITHUB_TOKEN` |
| Push Docker Image | `docker push` de las dos etiquetas al registry |
| Cleanup | `docker logout ghcr.io` |

El bloque `post` registra el resultado y la duración del build. En caso de fallo imprime el número de build y un mensaje para revisar los logs.

Configurar en Jenkins las credenciales con los IDs `GITHUB_USERNAME` y `GITHUB_TOKEN` antes de ejecutar el pipeline.

---

## GitHub Actions — ci.yml

Archivo: `.github/workflows/ci.yml`

Pipeline de integración continua que se ejecuta automáticamente en push y pull requests a `main` y `develop`.

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  validate-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18.x
          cache: npm
      - name: Validar estructura del proyecto
      - name: Validar sintaxis JavaScript
      - name: Instalar dependencias
      - name: Auditoría de dependencias
      - name: Ejecutar tests
      - name: Subir cobertura a Codecov
      - name: Verificar que la aplicación inicia
```

Secuencia de pasos:

1. Checkout del código fuente con `actions/checkout@v4`
2. Configurar Node.js 18.x con caché de npm para acelerar builds posteriores
3. Verificar que existen los archivos `app.js`, `taskManager.js`, `validators.js`, `server.js`, `package.json` y el directorio `__tests__/`
4. Ejecutar `node -c` sobre cada archivo JS para detectar errores de sintaxis antes de instalar dependencias
5. `npm ci` — instalación limpia y reproducible a partir de `package-lock.json`
6. `npm audit --audit-level=high` — detecta vulnerabilidades de severidad alta o crítica; se permite continuar si solo hay advertencias de nivel bajo/medio
7. `npm test` — ejecuta Jest con cobertura; falla si el threshold del 70% no se alcanza
8. `codecov/codecov-action@v4` sube el reporte `lcov.info` a Codecov
9. `timeout 10s node server.js` verifica que el proceso arranca y no crashea inmediatamente; un timeout (código 124) se considera éxito

---

## Kubernetes

Los manifiestos en `k8s/` son configuraciones base para desplegar la aplicación en un clúster Kubernetes.

### k8s/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devops-lab
spec:
  replicas: 2
  selector:
    matchLabels:
      app: devops-lab
  template:
    metadata:
      labels:
        app: devops-lab
    spec:
      containers:
      - name: app
        image: tuusuario/devops-lab:latest
        ports:
        - containerPort: 3000
```

Actualmente define 2 replicas. Antes de aplicar, reemplazar el valor de `image` con la URL real de la imagen en GHCR:

```
ghcr.io/Camilopzgz/devops-lab:latest
```

### k8s/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: devops-lab-service
spec:
  selector:
    app: devops-lab
  ports:
  - port: 80
    targetPort: 3000
  type: NodePort
```

Expone la aplicación en el puerto 80 del nodo, redirigiendo al puerto 3000 del contenedor.

Aplicar ambos manifiestos:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

---

## Variables de entorno

### GitHub Actions (automáticas)

Estas variables las provee GitHub Actions y no requieren configuración manual:

```
GITHUB_TOKEN        Token de acceso para publicar en GHCR
GITHUB_SHA          SHA del commit que disparó el workflow
GITHUB_REF          Ref de la rama o tag
GITHUB_REPOSITORY   Nombre del repositorio en formato owner/repo
```

### Jenkins (configuración manual)

Crear en Jenkins > Manage Jenkins > Credentials:

```
GITHUB_USERNAME   Usuario de GitHub
GITHUB_TOKEN      Personal access token con scopes read:packages y write:packages
```

### Aplicación

El servidor corre en el puerto `3000` (valor fijo en `server.js`). Para cambiarlo en un entorno desplegado, modificar el valor directamente o adaptar el código para leer `process.env.PORT`.

---

Repositorio: https://github.com/Camilopzgz/cicd

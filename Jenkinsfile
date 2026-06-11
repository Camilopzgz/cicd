pipeline {
    agent any
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    environment {
        REGISTRY = 'ghcr.io'
        IMAGE_NAME = "${REGISTRY}/${GIT_REPOSITORY_OWNER}/devops-lab"
        IMAGE_TAG = "${BUILD_NUMBER}"
        DOCKERFILE_PATH = './Dockerfile'
    }
    
    stages {
        stage('Clone Repository') {
            steps {
                script {
                    echo "========== Clonando Repositorio =========="
                    
                    sh '''
                        # Clonar el repositorio
                        git clone https://github.com/Camilopzgz/cicd.git .
                        
                        echo "✓ Repositorio clonado exitosamente"
                        
                        # Mostrar información del repositorio
                        echo "Git Commit: $(git rev-parse --short HEAD)"
                        echo "Git Branch: $(git rev-parse --abbrev-ref HEAD)"
                        echo "Git URL: $(git config --get remote.origin.url)"
                    '''
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo "========== Construyendo Imagen Docker =========="
                    
                    sh '''
                        echo "Imagen: ${IMAGE_NAME}:${IMAGE_TAG}"
                        echo "Dockerfile: ${DOCKERFILE_PATH}"
                        
                        docker build \
                            --tag ${IMAGE_NAME}:${IMAGE_TAG} \
                            --tag ${IMAGE_NAME}:latest \
                            --label "build.number=${BUILD_NUMBER}" \
                            --label "git.commit=$(git rev-parse --short HEAD)" \
                            --label "git.branch=$(git rev-parse --abbrev-ref HEAD)" \
                            -f ${DOCKERFILE_PATH} \
                            .
                        
                        echo "✓ Imagen Docker construida exitosamente"
                        
                        # Mostrar información de la imagen
                        docker images | grep devops-lab
                    '''
                }
            }
        }
        
        stage('Test Docker Image') {
            steps {
                script {
                    echo "========== Probando Imagen Docker =========="
                    
                    sh '''
                        echo "Iniciando contenedor de prueba..."
                        CONTAINER_ID=$(docker run -d -p 3000:3000 ${IMAGE_NAME}:${IMAGE_TAG})
                        echo "Container ID: $CONTAINER_ID"
                        
                        # Esperar a que la aplicación inicie
                        sleep 3
                        
                        # Verificar que la aplicación responde
                        echo "Verificando endpoints..."
                        curl -f http://localhost:3000/ || exit 1
                        echo "✓ Endpoint / respondiendo correctamente"
                        
                        curl -f http://localhost:3000/health || exit 1
                        echo "✓ Health check respondiendo correctamente"
                        
                        # Detener el contenedor de prueba
                        docker stop $CONTAINER_ID
                        docker rm $CONTAINER_ID
                        
                        echo "✓ Pruebas de imagen completadas exitosamente"
                    '''
                }
            }
        }
        
        stage('Authenticate Docker Registry') {
            steps {
                script {
                    echo "========== Autenticando en Docker Registry =========="
                    
                    sh '''
                        # Para GHCR.io (necesario si el registry es privado)
                        echo "${GITHUB_TOKEN}" | docker login ghcr.io -u ${GITHUB_USERNAME} --password-stdin
                        echo "✓ Autenticado en GitHub Container Registry"
                    '''
                }
            }
        }
        
        stage('Push Docker Image') {
            steps {
                script {
                    echo "========== Publicando Imagen en GHCR =========="
                    
                    sh '''
                        echo "Pusheando imagen ${IMAGE_NAME}:${IMAGE_TAG}"
                        docker push ${IMAGE_NAME}:${IMAGE_TAG}
                        echo "✓ Imagen ${IMAGE_NAME}:${IMAGE_TAG} pusheada"
                        
                        echo "Pusheando imagen ${IMAGE_NAME}:latest"
                        docker push ${IMAGE_NAME}:latest
                        echo "✓ Imagen ${IMAGE_NAME}:latest pusheada"
                        
                        echo ""
                        echo "========== URLs de Imagen =========="
                        echo "Imagen versión: ${IMAGE_NAME}:${IMAGE_TAG}"
                        echo "Imagen latest: ${IMAGE_NAME}:latest"
                        echo ""
                        echo "Para descargar:"
                        echo "  docker pull ${IMAGE_NAME}:${IMAGE_TAG}"
                        echo "  docker pull ${IMAGE_NAME}:latest"
                    '''
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                script {
                    echo "========== Limpiando Recursos =========="
                    
                    sh '''
                        # Remover imagen local después de pushearla
                        # (opcional - comenta si quieres mantenerla)
                        # docker rmi ${IMAGE_NAME}:${IMAGE_TAG}
                        # docker rmi ${IMAGE_NAME}:latest
                        
                        # Hacer logout del registry (recomendado por seguridad)
                        docker logout ghcr.io || true
                        # docker logout docker.io || true
                        
                        echo "✓ Limpieza completada"
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo "========== Pipeline Exitoso =========="
            echo "✓ Build #${BUILD_NUMBER} completado exitosamente"
            echo "✓ Imagen ${IMAGE_NAME}:${IMAGE_TAG} construida, testeada y publicada"
        }
        failure {
            echo "========== Pipeline Falló =========="
            echo "✗ Build #${BUILD_NUMBER} falló"
            echo "✗ Revisar logs para más detalles"
        }
        always {
            echo "========== Información del Build =========="
            echo "Build Number: ${BUILD_NUMBER}"
            echo "Build Status: ${currentBuild.result}"
            echo "Build Duration: ${currentBuild.durationString}"
        }
    }
}

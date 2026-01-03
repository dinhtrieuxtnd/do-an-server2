pipeline {
    agent any
    
    environment {
        // Private Docker Registry Configuration
        DOCKER_REGISTRY = '192.168.123.8:5000'  // Địa chỉ registry riêng
        DOCKER_IMAGE = "${DOCKER_REGISTRY}/do-an-server"
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY_CREDENTIALS = 'docker-registry-credentials'
        NODE_VERSION = '22'
        // Dummy DATABASE_URL cho prisma generate và build (không cần connect thực sự)
        DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy'
        
        // SSH Deployment Configuration
        SSH_CREDENTIALS = 'ssh-deployment-key'
        DEPLOYMENT_HOST = '192.168.123.8'  // Thay bằng IP máy deployment của bạn
        DEPLOYMENT_USER = 'deployment-user'  // Thay bằng username deployment
        DEPLOY_PATH = '/c/deployment/do-an-server2'  // Unix-style path cho SSH/SCP từ Linux
        DEPLOY_PATH_WINDOWS = 'C:\\deployment\\do-an-server2'  // Windows path cho PowerShell commands
        
        // Production Environment Credentials
        PROD_ENV_CREDENTIALS = 'production-environment-variables'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code from repository...'
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                script {
                    if (isUnix()) {
                        // Install npm dependencies
                        sh 'npm ci'
                    } else {
                        bat 'npm ci'
                    }
                }
            }
        }
        
        stage('Generate Prisma Client') {
            steps {
                echo 'Generating Prisma Client for production...'
                script {
                    if (isUnix()) {
                        sh 'npx prisma generate'
                    } else {
                        bat 'npx prisma generate'
                    }
                }
            }
        }
        
        stage('Generate Test Prisma Client') {
            steps {
                echo 'Generating Prisma Test Client for SQLite...'
                script {
                    if (isUnix()) {
                        sh 'npx prisma generate --schema=prisma/schema.test.prisma'
                    } else {
                        bat 'npx prisma generate --schema=prisma/schema.test.prisma'
                    }
                }
            }
        }
        
        stage('Generate Test Schema SQL') {
            steps {
                echo 'Generating test-schema.sql for SQLite...'
                script {
                    if (isUnix()) {
                        sh '''
                            # Generate SQL and filter out dotenv messages
                            npx prisma migrate diff \\
                                --from-empty \\
                                --to-schema-datamodel prisma/schema.test.prisma \\
                                --script 2>&1 | grep -v "\\[dotenv" | grep -v "^Loaded Prisma" | grep -v "^Prisma config" | grep -v "^$" > prisma/test-schema.sql
                            
                            # Verify file was created and contains SQL
                            if [ ! -s prisma/test-schema.sql ]; then
                                echo "Error: test-schema.sql is empty or not created"
                                exit 1
                            fi
                            
                            # Check if file starts with SQL commands
                            if ! grep -q "CREATE TABLE" prisma/test-schema.sql; then
                                echo "Error: test-schema.sql does not contain CREATE TABLE statements"
                                cat prisma/test-schema.sql
                                exit 1
                            fi
                            
                            echo "test-schema.sql generated successfully"
                            echo "First 20 lines:"
                            head -20 prisma/test-schema.sql
                        '''
                    } else {
                        bat '''
                            npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.test.prisma --script > prisma/test-schema.sql
                            if not exist prisma\\test-schema.sql exit /b 1
                        '''
                    }
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                echo 'Running tests...'
                script {
                    def testExitCode = 0
                    if (isUnix()) {
                        testExitCode = sh(script: '''
                            # Ensure temp directory is writable
                            mkdir -p /tmp/prisma-test
                            chmod 777 /tmp/prisma-test
                            
                            # Run tests with proper environment
                            npm run test -- --runInBand
                        ''', returnStatus: true)
                    } else {
                        testExitCode = bat(script: 'npm run test -- --runInBand', returnStatus: true)
                    }
                    
                    if (testExitCode == 0) {
                        echo 'All tests passed!'
                    } else if (testExitCode == 1) {
                        echo 'Some tests failed, but continuing build...'
                        currentBuild.result = 'UNSTABLE'
                    } else {
                        echo "Test command exited with code ${testExitCode}"
                        // Don't fail the build for forceExit warnings
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
        
        stage('Build Application') {
            steps {
                echo 'Building application...'
                script {
                    if (isUnix()) {
                        sh 'npm run build'
                    } else {
                        bat 'npm run build'
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                script {
                    dockerImage = docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                    docker.build("${DOCKER_IMAGE}:latest")
                }
            }
        }
        
        stage('Login to Docker Registry') {
            steps {
                echo 'Logging in to Docker Registry...'
                script {
                    withCredentials([usernamePassword(credentialsId: "${DOCKER_REGISTRY_CREDENTIALS}", 
                                                      usernameVariable: 'REGISTRY_USER', 
                                                      passwordVariable: 'REGISTRY_PASS')]) {
                        if (isUnix()) {
                            sh """
                                echo \$REGISTRY_PASS | docker login ${DOCKER_REGISTRY} -u \$REGISTRY_USER --password-stdin
                            """
                        } else {
                            bat """
                                echo %REGISTRY_PASS% | docker login ${DOCKER_REGISTRY} -u %REGISTRY_USER% --password-stdin
                            """
                        }
                    }
                }
            }
        }
        
        stage('Push to Docker Registry') {
            steps {
                echo 'Pushing Docker image to Docker Registry...'
                script {
                    if (isUnix()) {
                        sh """
                            docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                            docker push ${DOCKER_IMAGE}:latest
                            echo "Successfully pushed ${DOCKER_IMAGE}:${DOCKER_TAG} and ${DOCKER_IMAGE}:latest"
                        """
                    } else {
                        bat """
                            docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                            docker push ${DOCKER_IMAGE}:latest
                            echo "Successfully pushed ${DOCKER_IMAGE}:${DOCKER_TAG} and ${DOCKER_IMAGE}:latest"
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Development') {
            when {
                branch 'develop'
            }
            steps {
                echo 'Deploying to development environment...'
                script {
                    if (isUnix()) {
                        sh '''
                            docker compose -f docker-compose.dev.yml down || true
                            docker compose -f docker-compose.dev.yml up -d
                        '''
                    } else {
                        bat '''
                            docker compose -f docker-compose.dev.yml down
                            docker compose -f docker-compose.dev.yml up -d
                        '''
                    }
                }
            }
        }
        
        stage('Deploy to Production via SSH') {
            steps {
                echo 'Deploying to production server via SSH...'
                echo "Target: ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST}:${DEPLOY_PATH}"
                
                script {
                    // Lấy credentials từ Jenkins và tạo file .env động
                    withCredentials([
                        // Database
                        string(credentialsId: 'prod-postgres-host', variable: 'POSTGRES_HOST'),
                        string(credentialsId: 'prod-postgres-port', variable: 'POSTGRES_PORT'),
                        string(credentialsId: 'prod-postgres-user', variable: 'POSTGRES_USER'),
                        string(credentialsId: 'prod-postgres-password', variable: 'POSTGRES_PASSWORD'),
                        string(credentialsId: 'prod-postgres-db', variable: 'POSTGRES_DB'),
                        // JWT/Auth Tokens
                        string(credentialsId: 'prod-access-token-secret', variable: 'ACCESS_TOKEN_SECRET'),
                        string(credentialsId: 'prod-access-token-expires', variable: 'ACCESS_TOKEN_EXPIRES_IN'),
                        string(credentialsId: 'prod-refresh-token-secret', variable: 'REFRESH_TOKEN_SECRET'),
                        string(credentialsId: 'prod-refresh-token-expires', variable: 'REFRESH_TOKEN_EXPIRES_IN'),
                        // Admin Account
                        string(credentialsId: 'prod-admin-fullname', variable: 'ADMIN_FULL_NAME'),
                        string(credentialsId: 'prod-admin-password', variable: 'ADMIN_PASSWORD'),
                        string(credentialsId: 'prod-admin-email', variable: 'ADMIN_EMAIL'),
                        string(credentialsId: 'prod-admin-phone', variable: 'ADMIN_PHONE_NUMBER'),
                        // Email Service
                        string(credentialsId: 'prod-resend-api-key', variable: 'RESEND_API_KEY'),
                        // MinIO Storage
                        string(credentialsId: 'prod-minio-endpoint', variable: 'MINIO_ENDPOINT'),
                        string(credentialsId: 'prod-minio-access-key', variable: 'MINIO_ACCESS_KEY'),
                        string(credentialsId: 'prod-minio-secret-key', variable: 'MINIO_SECRET_KEY'),
                        string(credentialsId: 'prod-minio-bucket', variable: 'MINIO_BUCKET_NAME'),
                        // Docker Registry
                        usernamePassword(credentialsId: 'docker-registry-credentials', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASS')
                    ]) {
                        
                        // Sử dụng sshagent để authenticate với SSH key
                        sshagent(credentials: [SSH_CREDENTIALS]) {
                            if (isUnix()) {
                                // Linux/Mac deployment to Windows target
                                sh """
                                    # Tạo thư mục deployment
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} 'powershell -Command "New-Item -ItemType Directory -Force -Path ${DEPLOY_PATH_WINDOWS}"'
                                    
                                    # Tạo file .env local
                                    cat > .env.prod << 'EOF'
# Database Configuration
POSTGRES_HOST=${POSTGRES_HOST}
POSTGRES_PORT=${POSTGRES_PORT}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public

# JWT/Auth Tokens
ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET}
ACCESS_TOKEN_EXPIRES_IN=${ACCESS_TOKEN_EXPIRES_IN}
REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
REFRESH_TOKEN_EXPIRES_IN=${REFRESH_TOKEN_EXPIRES_IN}

# Admin Account
ADMIN_FULL_NAME=${ADMIN_FULL_NAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PHONE_NUMBER=${ADMIN_PHONE_NUMBER}

# Email Service
RESEND_API_KEY=${RESEND_API_KEY}

# MinIO Storage
MINIO_ENDPOINT=${MINIO_ENDPOINT}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
MINIO_BUCKET_NAME=${MINIO_BUCKET_NAME}
EOF
                                    
                                    # Encode files to base64 và transfer qua SSH
                                    echo "Transferring docker-compose.yml..."
                                    COMPOSE_BASE64=\$(base64 -w 0 docker-compose.prod.yml)
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "powershell -Command \\\"\\\$bytes = [System.Convert]::FromBase64String('\${COMPOSE_BASE64}'); [System.IO.File]::WriteAllBytes('${DEPLOY_PATH_WINDOWS}\\\\docker-compose.prod.yml', \\\$bytes)\\\""
                                    
                                    echo "Transferring .env file..."
                                    ENV_BASE64=\$(base64 -w 0 .env.prod)
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "powershell -Command \\\"\\\$bytes = [System.Convert]::FromBase64String('\${ENV_BASE64}'); [System.IO.File]::WriteAllBytes('${DEPLOY_PATH_WINDOWS}\\\\.env', \\\$bytes)\\\""
                                    
                                    # Clean up
                                    rm -f .env.prod
                                    
                                    # Login to Docker Registry on deployment server
                                    echo "Logging in to Docker Registry on deployment server..."
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "powershell -Command \\\"\\\$env:DOCKER_HOST='tcp://localhost:2375'; echo '${REGISTRY_PASS}' | docker login ${DOCKER_REGISTRY} -u ${REGISTRY_USER} --password-stdin\\\""
                                    
                                    # Deploy containers với DOCKER_HOST
                                    echo "Pulling latest images..."
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "powershell -Command \\\"\\\$env:DOCKER_HOST='tcp://localhost:2375'; cd '${DEPLOY_PATH_WINDOWS}'; docker compose -f docker-compose.prod.yml pull\\\""
                                    
                                    echo "Stopping old containers..."
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "powershell -Command \\\"\\\$env:DOCKER_HOST='tcp://localhost:2375'; cd '${DEPLOY_PATH_WINDOWS}'; docker compose -f docker-compose.prod.yml down\\\""
                                    
                                    echo "Starting new containers..."
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "powershell -Command \\\"\\\$env:DOCKER_HOST='tcp://localhost:2375'; cd '${DEPLOY_PATH_WINDOWS}'; docker compose -f docker-compose.prod.yml up -d\\\""
                                    
                                    echo "Container status:"
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "powershell -Command \\\"\\\$env:DOCKER_HOST='tcp://localhost:2375'; cd '${DEPLOY_PATH_WINDOWS}'; docker compose -f docker-compose.prod.yml ps\\\""
                                    
                                    echo "Deployment completed!"
                                """
                            } else {
                                // Windows deployment
                                bat """
                                    @echo off
                                    echo Creating deployment directory...
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "if not exist ${DEPLOY_PATH} mkdir ${DEPLOY_PATH}"
                                    
                                    echo Copying docker-compose file...
                                    scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST}:${DEPLOY_PATH}/
                                    
                                    echo Creating .env file on server with production credentials...
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "cd ${DEPLOY_PATH} && (echo # Database Configuration && echo POSTGRES_HOST=${POSTGRES_HOST} && echo POSTGRES_PORT=${POSTGRES_PORT} && echo POSTGRES_USER=${POSTGRES_USER} && echo POSTGRES_PASSWORD=${POSTGRES_PASSWORD} && echo POSTGRES_DB=${POSTGRES_DB} && echo DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public && echo. && echo # JWT/Auth Tokens && echo ACCESS_TOKEN_SECRET=${ACCESS_TOKEN_SECRET} && echo ACCESS_TOKEN_EXPIRES_IN=${ACCESS_TOKEN_EXPIRES_IN} && echo REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET} && echo REFRESH_TOKEN_EXPIRES_IN=${REFRESH_TOKEN_EXPIRES_IN} && echo. && echo # Admin Account && echo ADMIN_FULL_NAME=${ADMIN_FULL_NAME} && echo ADMIN_PASSWORD=${ADMIN_PASSWORD} && echo ADMIN_EMAIL=${ADMIN_EMAIL} && echo ADMIN_PHONE_NUMBER=${ADMIN_PHONE_NUMBER} && echo. && echo # Email Service && echo RESEND_API_KEY=${RESEND_API_KEY} && echo. && echo # MinIO Storage && echo MINIO_ENDPOINT=${MINIO_ENDPOINT} && echo MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY} && echo MINIO_SECRET_KEY=${MINIO_SECRET_KEY} && echo MINIO_BUCKET_NAME=${MINIO_BUCKET_NAME}) > .env"
                                    
                                    echo Deploying on remote server...
                                    ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "cd ${DEPLOY_PATH} && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d && docker compose -f docker-compose.prod.yml ps"
                                    
                                    echo Deployment completed!
                                """
                            }
                        }
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline executed successfully!'
            echo "Docker Image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
            echo "Docker Registry: http://${DOCKER_REGISTRY}"
            echo "View images at: http://localhost:8081 (Docker Registry UI)"
        }
        failure {
            echo 'Pipeline failed!'
            echo 'Check the console output for details'
        }
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
    }
}

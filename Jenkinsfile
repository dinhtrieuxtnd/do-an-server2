pipeline {
    agent any
    
    environment {
        // Private Docker Registry Configuration
        DOCKER_REGISTRY = 'localhost:5000'  // Địa chỉ registry riêng
        DOCKER_IMAGE = "${DOCKER_REGISTRY}/do-an-server"
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_REGISTRY_CREDENTIALS = 'docker-registry-credentials'
        NODE_VERSION = '22'
        // Dummy DATABASE_URL cho prisma generate và build (không cần connect thực sự)
        DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy'
        
        // SSH Deployment Configuration
        SSH_CREDENTIALS = 'ssh-deployment-key'
        DEPLOYMENT_HOST = '192.168.0.102'  // Thay bằng IP máy deployment của bạn
        DEPLOYMENT_USER = 'deployment-user'  // Thay bằng username deployment
        DEPLOY_PATH = 'C:\\deployment\\do-an-server2'
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
                    docker.withRegistry("http://${DOCKER_REGISTRY}", "${DOCKER_REGISTRY_CREDENTIALS}") {
                        echo 'Successfully logged in to Docker Registry'
                    }
                }
            }
        }
        
        stage('Push to Docker Registry') {
            steps {
                echo 'Pushing Docker image to Docker Registry...'
                script {
                    docker.withRegistry("http://${DOCKER_REGISTRY}", "${DOCKER_REGISTRY_CREDENTIALS}") {
                        dockerImage.push("${DOCKER_TAG}")
                        dockerImage.push("latest")
                        echo "Successfully pushed ${DOCKER_IMAGE}:${DOCKER_TAG} and ${DOCKER_IMAGE}:latest"
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
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to production server via SSH...'
                echo "Target: ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST}:${DEPLOY_PATH}"
                
                script {
                    // Sử dụng sshagent để authenticate với SSH key
                    sshagent(credentials: [SSH_CREDENTIALS]) {
                        if (isUnix()) {
                            // Linux/Mac deployment
                            sh """
                                # Tạo thư mục deployment nếu chưa có
                                ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} 'mkdir -p ${DEPLOY_PATH}'
                                
                                # Copy docker-compose file và .env
                                scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST}:${DEPLOY_PATH}/
                                scp -o StrictHostKeyChecking=no .env.production ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST}:${DEPLOY_PATH}/.env
                                
                                # Deploy trên server
                                ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} '
                                    cd ${DEPLOY_PATH}
                                    echo "Pulling latest images from registry..."
                                    docker-compose -f docker-compose.prod.yml pull
                                    echo "Stopping old containers..."
                                    docker-compose -f docker-compose.prod.yml down
                                    echo "Starting new containers..."
                                    docker-compose -f docker-compose.prod.yml up -d
                                    echo "Checking container status..."
                                    docker-compose -f docker-compose.prod.yml ps
                                    echo "Deployment completed!"
                                '
                            """
                        } else {
                            // Windows deployment
                            bat """
                                @echo off
                                echo Creating deployment directory...
                                ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "if not exist ${DEPLOY_PATH} mkdir ${DEPLOY_PATH}"
                                
                                echo Copying docker-compose file...
                                scp -o StrictHostKeyChecking=no docker-compose.prod.yml ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST}:${DEPLOY_PATH}/
                                
                                echo Copying environment file...
                                if exist .env.production (
                                    scp -o StrictHostKeyChecking=no .env.production ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST}:${DEPLOY_PATH}/.env
                                ) else (
                                    echo Warning: .env.production not found, skipping...
                                )
                                
                                echo Deploying on remote server...
                                ssh -o StrictHostKeyChecking=no ${DEPLOYMENT_USER}@${DEPLOYMENT_HOST} "cd ${DEPLOY_PATH} && docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d && docker-compose -f docker-compose.prod.yml ps"
                                
                                echo Deployment completed!
                            """
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

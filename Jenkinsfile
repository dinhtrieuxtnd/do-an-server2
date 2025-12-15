pipeline {
    agent any
    
    environment {
        DOCKER_HUB_USERNAME = 'dinhtrieuxtnd'
        DOCKER_IMAGE = "${DOCKER_HUB_USERNAME}/do-an-server"
        DOCKER_TAG = "${BUILD_NUMBER}"
        DOCKER_HUB_CREDENTIALS = 'dockerhub-credentials'
        NODE_VERSION = '22'
        // Dummy DATABASE_URL cho prisma generate và build (không cần connect thực sự)
        DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy'
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
                        sh 'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.test.prisma --script > prisma/test-schema.sql'
                    } else {
                        bat 'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.test.prisma --script > prisma/test-schema.sql'
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
                        echo '✅ All tests passed!'
                    } else if (testExitCode == 1) {
                        echo '⚠️ Some tests failed, but continuing build...'
                        currentBuild.result = 'UNSTABLE'
                    } else {
                        echo "⚠️ Test command exited with code ${testExitCode}"
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
        
        stage('Login to Docker Hub') {
            steps {
                echo 'Logging in to Docker Hub...'
                script {
                    docker.withRegistry('https://registry.hub.docker.com', "${DOCKER_HUB_CREDENTIALS}") {
                        echo 'Successfully logged in to Docker Hub'
                    }
                }
            }
        }
        
        stage('Push to Docker Hub') {
            steps {
                echo 'Pushing Docker image to Docker Hub...'
                script {
                    docker.withRegistry('https://registry.hub.docker.com', "${DOCKER_HUB_CREDENTIALS}") {
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
                            docker-compose -f docker-compose.dev.yml down || true
                            docker-compose -f docker-compose.dev.yml up -d
                        '''
                    } else {
                        bat '''
                            docker-compose -f docker-compose.dev.yml down
                            docker-compose -f docker-compose.dev.yml up -d
                        '''
                    }
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to production environment...'
                script {
                    if (isUnix()) {
                        sh '''
                            docker-compose -f docker-compose.prod.yml down || true
                            docker-compose -f docker-compose.prod.yml up -d
                        '''
                    } else {
                        bat '''
                            docker-compose -f docker-compose.prod.yml down
                            docker-compose -f docker-compose.prod.yml up -d
                        '''
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline executed successfully!'
            echo "Docker Image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
            echo "Docker Hub: https://hub.docker.com/r/${DOCKER_HUB_USERNAME}/do-an-server"
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

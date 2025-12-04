pipeline {
    agent any
    
    environment {
        EC2_PUBLIC_IP = '13.235.97.7'
        TEST_BASE_URL = "http://${EC2_PUBLIC_IP}:3001"
        APP_REPO = 'https://github.com/muhammadhussnain157/todoNextJs.git'
        TEST_REPO = 'https://github.com/muhammadhussnain157/todo-app-tests.git'
    }

    stages {
        stage('Checkout Application Code') {
            steps {
                echo '========== Checking out Application from GitHub =========='
                dir('app') {
                    git branch: 'main', url: "${APP_REPO}"
                }
            }
        }

        stage('Checkout Test Code') {
            steps {
                echo '========== Checking out Tests from GitHub =========='
                dir('tests') {
                    git branch: 'main', url: "${TEST_REPO}"
                }
            }
        }

        stage('Verify Files') {
            steps {
                echo '========== Verifying required files =========='
                sh '''
                    echo "Application files:"
                    ls -la app/
                    
                    echo "Test files:"
                    ls -la tests/
                    
                    if [ ! -f "app/docker-compose.jenkins.yml" ]; then
                        echo "ERROR: docker-compose.jenkins.yml not found!"
                        exit 1
                    fi
                '''
            }
        }

        stage('Stop Existing Containers') {
            steps {
                echo '========== Stopping existing containers =========='
                dir('app') {
                    sh '''
                        docker-compose -f docker-compose.jenkins.yml down || true
                        docker rm -f todo-jenkins-web todo-jenkins-db || true
                        docker system prune -f
                    '''
                }
            }
        }

        stage('Build and Run Application') {
            steps {
                echo '========== Building and running application =========='
                dir('app') {
                    sh '''
                        docker-compose -f docker-compose.jenkins.yml up -d --build
                        
                        echo "Waiting for containers to be ready (this may take 2-3 minutes)..."
                        sleep 120
                        
                        echo "Checking if containers are still running..."
                        docker ps
                    '''
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                echo '========== Verifying deployment =========='
                script {
                    // Check if web container is running
                    def webRunning = sh(
                        script: 'docker ps | grep todo-jenkins-web',
                        returnStatus: true
                    )
                    
                    if (webRunning == 0) {
                        echo '✓ Web container is running'
                    } else {
                        echo '✗ Web container is NOT running! Checking logs...'
                        sh 'docker logs todo-jenkins-web --tail 100 || true'
                        sh 'docker ps -a | grep todo-jenkins || true'
                        error 'Web container is not running!'
                    }
                    
                    // Check if db container is running
                    def dbRunning = sh(
                        script: 'docker ps | grep todo-jenkins-db',
                        returnStatus: true
                    )
                    
                    if (dbRunning == 0) {
                        echo '✓ Database container is running'
                    } else {
                        echo '✗ Database container is NOT running! Checking logs...'
                        sh 'docker logs todo-jenkins-db --tail 100 || true'
                        error 'Database container is not running!'
                    }
                    
                    // Test application accessibility with retry
                    def appReady = false
                    for (int i = 0; i < 5; i++) {
                        def curlStatus = sh(
                            script: 'curl -f -s http://localhost:3001 > /dev/null',
                            returnStatus: true
                        )
                        if (curlStatus == 0) {
                            appReady = true
                            echo "✓ Application is accessible at http://localhost:3001"
                            break
                        }
                        echo "Attempt ${i+1}/5: App not ready, waiting 10 seconds..."
                        sleep 10
                    }
                    
                    if (!appReady) {
                        echo 'Application is not responding. Displaying logs...'
                        sh 'docker logs todo-jenkins-web --tail 100 || true'
                        error 'Application failed to start!'
                    }
                }
            }
        }

        stage('Run Selenium Tests') {
            agent {
                dockerfile {
                    filename 'Dockerfile.test'
                    dir 'tests'
                    args '-u root:root --network host'
                    reuseNode true
                }
            }
            steps {
                echo '========== Running Automated Selenium Tests =========='
                dir('tests') {
                    sh '''
                        echo "Installing test dependencies..."
                        npm install
                        
                        echo "Running test suite..."
                        export TEST_BASE_URL=${TEST_BASE_URL}
                        npm test || true
                        
                        echo "Tests completed!"
                    '''
                }
            }
        }

        stage('Publish Test Results') {
            steps {
                echo '========== Publishing Test Results =========='
                dir('tests') {
                    junit allowEmptyResults: true, testResults: '**/test-results/*.xml'
                }
            }
        }

        stage('Display Container Logs') {
            steps {
                echo '========== Container Logs =========='
                sh '''
                    echo "=== Web Container Logs ==="
                    docker logs todo-jenkins-web --tail 50 || true
                    
                    echo "\\n=== Database Container Logs ==="
                    docker logs todo-jenkins-db --tail 20 || true
                '''
            }
        }
    }

    post {
        always {
            script {
                echo '========== Preparing Test Results Email =========='
                
                // Get commit author email from test repository
                def committer = sh(
                    script: "cd tests && git log -1 --pretty=format:'%ae'",
                    returnStdout: true
                ).trim()

                def testResultsExist = fileExists('tests/test-results/junit.xml')
                
                if (testResultsExist) {
                    def raw = sh(
                        script: "grep -h '<testcase' tests/test-results/junit.xml || echo ''",
                        returnStdout: true
                    ).trim()

                    int total = 0
                    int passed = 0
                    int failed = 0
                    int skipped = 0
                    def details = ""

                    if (raw) {
                        raw.split('\n').each { line ->
                            if (line.contains('<testcase')) {
                                total++
                                def nameMatcher = (line =~ /name="([^"]+)"/)
                                def name = nameMatcher ? nameMatcher[0][1] : "Unknown Test"

                                if (line.contains('<failure')) {
                                    failed++
                                    details += "${name} — FAILED\\n"
                                } else if (line.contains('<skipped')) {
                                    skipped++
                                    details += "${name} — SKIPPED\\n"
                                } else {
                                    passed++
                                    details += "${name} — PASSED\\n"
                                }
                            }
                        }
                    }

                    def buildStatus = currentBuild.result ?: 'SUCCESS'
                    def deploymentUrl = "http://${EC2_PUBLIC_IP}:3001"

                    def emailBody = """
==============================================
Todo App - Test Results
==============================================

Build Information:
------------------
Build Number:      #${env.BUILD_NUMBER}
Build Status:      ${buildStatus}
Job Name:          ${env.JOB_NAME}
Build URL:         ${env.BUILD_URL}

Repository Information:
-----------------------
Application Repo:  ${APP_REPO}
Test Repo:         ${TEST_REPO}

Deployment Information:
-----------------------
Application URL:   ${deploymentUrl}
EC2 IP:            ${EC2_PUBLIC_IP}

Test Summary:
-------------
Total Tests:       ${total}
Passed:            ${passed}
Failed:            ${failed}
Skipped:           ${skipped}

Detailed Test Results:
----------------------
${details ?: 'No test details available'}

==============================================
Commit Information:
------------------
Committer:         ${committer}

==============================================
This is an automated message from Jenkins CI/CD Pipeline.
"""

                    def emailSubject = "Build #${env.BUILD_NUMBER} - ${buildStatus} - ${passed}/${total} Tests Passed"

                    emailext(
                        to: committer,
                        subject: emailSubject,
                        body: emailBody,
                        mimeType: 'text/plain',
                        replyTo: 'hussnainbhati157@gmail.com',
                        from: 'hussnainbhati157@gmail.com'
                    )
                    
                    echo "Email sent to: ${committer}"
                }
            }
        }
        success {
            echo '========== DEPLOYMENT AND TESTS SUCCESSFUL =========='
            echo "Application URL: http://${EC2_PUBLIC_IP}:3001"
        }
        failure {
            echo '========== DEPLOYMENT OR TESTS FAILED =========='
            sh 'cd app && docker-compose -f docker-compose.jenkins.yml logs || true'
        }
    }
}

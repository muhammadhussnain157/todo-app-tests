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
                                    details += "<tr style='background-color: #fee;'><td style='padding: 12px; border: 1px solid #ddd;'>${name}</td><td style='padding: 12px; border: 1px solid #ddd; color: #d32f2f; font-weight: bold;'>❌ FAILED</td></tr>"
                                } else if (line.contains('<skipped')) {
                                    skipped++
                                    details += "<tr style='background-color: #fef9e7;'><td style='padding: 12px; border: 1px solid #ddd;'>${name}</td><td style='padding: 12px; border: 1px solid #ddd; color: #f57c00; font-weight: bold;'>⊘ SKIPPED</td></tr>"
                                } else {
                                    passed++
                                    details += "<tr style='background-color: #f1f8f4;'><td style='padding: 12px; border: 1px solid #ddd;'>${name}</td><td style='padding: 12px; border: 1px solid #ddd; color: #2e7d32; font-weight: bold;'>✓ PASSED</td></tr>"
                                }
                            }
                        }
                    }

                    def buildStatus = currentBuild.result ?: 'SUCCESS'
                    def deploymentUrl = "http://${EC2_PUBLIC_IP}:3001"
                    def statusColor = buildStatus == 'SUCCESS' ? '#2e7d32' : '#d32f2f'
                    def statusIcon = buildStatus == 'SUCCESS' ? '✓' : '✗'

                    def emailBody = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
        .container { max-width: 800px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
        .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: bold; margin-top: 15px; }
        .status-success { background-color: #2e7d32; color: white; }
        .status-failure { background-color: #d32f2f; color: white; }
        .content { padding: 30px; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: 600; color: #667eea; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #667eea; }
        .info-grid { display: table; width: 100%; border-collapse: collapse; }
        .info-row { display: table-row; }
        .info-label { display: table-cell; padding: 10px; font-weight: 600; color: #555; width: 40%; background-color: #f8f9fa; border: 1px solid #e9ecef; }
        .info-value { display: table-cell; padding: 10px; border: 1px solid #e9ecef; }
        .info-value a { color: #667eea; text-decoration: none; }
        .info-value a:hover { text-decoration: underline; }
        .summary-cards { display: table; width: 100%; margin-top: 15px; }
        .summary-card { display: table-cell; text-align: center; padding: 20px; border-radius: 6px; margin: 0 5px; }
        .card-total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .card-passed { background-color: #e8f5e9; border: 2px solid #2e7d32; }
        .card-failed { background-color: #ffebee; border: 2px solid #d32f2f; }
        .card-skipped { background-color: #fff3e0; border: 2px solid #f57c00; }
        .card-number { font-size: 36px; font-weight: bold; margin: 5px 0; }
        .card-label { font-size: 14px; text-transform: uppercase; opacity: 0.8; }
        .test-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .test-table th { background-color: #667eea; color: white; padding: 12px; text-align: left; font-weight: 600; }
        .test-table td { padding: 12px; border: 1px solid #ddd; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${statusIcon} Todo App - CI/CD Pipeline</h1>
            <p>Automated Test Results</p>
            <div class="status-badge status-${buildStatus.toLowerCase()}">${buildStatus}</div>
        </div>
        
        <div class="content">
            <div class="section">
                <div class="section-title">📊 Test Summary</div>
                <table class="summary-cards">
                    <tr>
                        <td class="summary-card card-total">
                            <div class="card-number">${total}</div>
                            <div class="card-label">Total Tests</div>
                        </td>
                        <td class="summary-card card-passed">
                            <div class="card-number" style="color: #2e7d32;">${passed}</div>
                            <div class="card-label" style="color: #2e7d32;">Passed</div>
                        </td>
                        <td class="summary-card card-failed">
                            <div class="card-number" style="color: #d32f2f;">${failed}</div>
                            <div class="card-label" style="color: #d32f2f;">Failed</div>
                        </td>
                        <td class="summary-card card-skipped">
                            <div class="card-number" style="color: #f57c00;">${skipped}</div>
                            <div class="card-label" style="color: #f57c00;">Skipped</div>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">🔨 Build Information</div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Build Number</div>
                        <div class="info-value"><strong>#${env.BUILD_NUMBER}</strong></div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Job Name</div>
                        <div class="info-value">${env.JOB_NAME}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Build URL</div>
                        <div class="info-value"><a href="${env.BUILD_URL}" target="_blank">View in Jenkins</a></div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Committer</div>
                        <div class="info-value">${committer}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">🚀 Deployment Information</div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Application URL</div>
                        <div class="info-value"><a href="${deploymentUrl}" target="_blank">${deploymentUrl}</a></div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">EC2 IP Address</div>
                        <div class="info-value">${EC2_PUBLIC_IP}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">📁 Repository Information</div>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">Application Repository</div>
                        <div class="info-value"><a href="${APP_REPO}" target="_blank">${APP_REPO}</a></div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Test Repository</div>
                        <div class="info-value"><a href="${TEST_REPO}" target="_blank">${TEST_REPO}</a></div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">📝 Detailed Test Results</div>
                <table class="test-table">
                    <thead>
                        <tr>
                            <th>Test Case</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${details ?: '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #999;">No test details available</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Jenkins CI/CD Pipeline</p>
            <p>© ${new Date().format('yyyy')} Todo App Testing Suite</p>
        </div>
    </div>
</body>
</html>
"""

                    def emailSubject = "${statusIcon} Build #${env.BUILD_NUMBER} - ${buildStatus} - ${passed}/${total} Tests Passed"

                    emailext(
                        to: committer,
                        subject: emailSubject,
                        body: emailBody,
                        mimeType: 'text/html',
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

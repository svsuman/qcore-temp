@Library('qa-common-library') _
properties(
  [
  buildDiscarder(logRotator(artifactDaysToKeepStr: '', artifactNumToKeepStr: '10', daysToKeepStr: '', numToKeepStr: '20')),
    parameters(
    [
    string(
      // Added health check as default
        defaultValue: 'npx playwright test --grep @HealthCheck',
        //'npx playwright test basicSearchQuery.test.js',
        description: 'Test',
        name: 'test'
      ),
    string(
      defaultValue: 'develop',
      description: 'Select Test Environment. Matches the config file',
      name: 'environment'
    ),


    string(
      defaultValue: '#qa-auto-srchrecs-notify',
      description: 'Slack Notification Channel',
      name: 'slackChannel'
    ),
    ]
      )
      ])


def environmentVars
def summary
def upstreamUrl = "https://jenkins.dev.uts-squad.com/"
def suiteName = "API - Front BFF"
def replayLink = ""
def slackJunit = ""

// def artifactsString = 'report/test-report.html,junit.xml,jest-stare/**/*.*'
//def artifactsString = 'report/test-report.html,junit.xml'
def artifactsString = 'playwright-report/index.html'
def prefix = ""
def nodeImage = "510467250861.dkr.ecr.us-east-1.amazonaws.com/percipio-base:node-lts-alpine"

def getQASecrets(secretNames = [], secretRegion = 'us-east-1', destFolder = "/tmp/qa-secrets") {
  def assumeRoleArn = 'arn:aws:iam::401685041419:role/jenkins-master-qa-secret-role'
  echo "get QA -secret call"
  def roleSessionName = 'EC2FromDREAdmin'

  sh "mkdir -p " + destFolder
  // Assume the role allowed to talk to target account
  def stscall = '''
    set +x
    aws sts assume-role --role-arn ''' + assumeRoleArn + ''' --role-session-name ''' + roleSessionName + ''' --query \"Credentials.[AccessKeyId,SecretAccessKey,SessionToken]\" --output text 2>&1 > ''' + destFolder + '''/JenkinsMasterAccessKeys
    export QA_AWS_ACCESS_KEY_ID=$(cat ''' + destFolder + '''/JenkinsMasterAccessKeys | cut -d$'\t' -f1)
    export QA_AWS_SECRET_ACCESS_KEY=$(cat ''' + destFolder + '''/JenkinsMasterAccessKeys | cut -d$'\t' -f2)
    export QA_AWS_SESSION_TOKEN=$(cat ''' + destFolder + '''/JenkinsMasterAccessKeys | cut -d$'\t' -f3)
  '''
  for (secretName in secretNames) {
    stscall = stscall + '''
      mkdir -p ''' + destFolder + '/' + secretName + '''
      AWS_ACCESS_KEY_ID=\$QA_AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=\$QA_AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN=\$QA_AWS_SESSION_TOKEN aws secretsmanager get-secret-value --secret-id "''' + secretName + '''" --region ''' + secretRegion + ''' --query 'SecretString'  --output text > ''' + destFolder + '/' + secretName  + '''/value
    '''
  }
  stscall = stscall + '''
    set -x
  '''

  def output = sh(returnStdout: true, script: stscall);
  echo "secretOutput: ${output}"
}


pipeline {
    agent {
        label 'innrd87'
      }
      stages {
        // stage('Set Environment') {
        //     steps {
        //         script {
        //             if (params.environment == 'release') {
        //                 env.SECRET_NAME = 'release/srchrecs/genApiPercipio' //this matches the path given on aws.
        //                 echo "${env.SECRET_NAME}"
        //             }else if (params.environment == 'stage'){
        //                 env.SECRET_NAME = 'staging/srchrecs/genApiPercipio'
        //                 echo "${env.SECRET_NAME}"
        //             }else if (params.environment == 'develop'){
        //                 env.SECRET_NAME = 'develop/srchrecs/genApiPercipio' // macthes develop/lpsquad/lpawsapi-front-develop
        //                 echo "${env.SECRET_NAME}"
        //             }else if (params.environment == 'master'){
        //                 env.SECRET_NAME = 'master/srchrecs/genApiPercipio'
        //                 echo "${env.SECRET_NAME}"
        //             }else if (params.environment == 'eudc'){
        //                 env.SECRET_NAME = 'eudc/srchrecs/genApiPercipio'
        //                 echo "${env.SECRET_NAME}"
        //             }else if (params.environment == 'usdc'){
        //                 env.SECRET_NAME = 'usdc/srchrecs/genApiPercipio'
        //                 echo "${env.SECRET_NAME}"
        //             }
        //         }
        //     }
        // }
        // stage("GetCredentialsforQAAccounts") {
        
        //     steps {
        //       echo "Inside GetCredentialsforQAAccounts"
        //         script {
        //             // This will fetch the secrets from QA secret Manager and store it in the destFolder to destFolder/my/secret/name/value as a raw string
        //             getQASecrets(secretNames = ["${env.SECRET_NAME}"], secretRegion = 'eu-north-1', destFolder = "/tmp/qa-secrets")
        //             // see example here
        //             //sh 'cat /tmp/qa-secrets/develop/lpsquad/lpaws-ui-front-develop/value'
        //             // Define the file path
        //             def filePath = "/tmp/qa-secrets/${env.SECRET_NAME}/value"

        //             // Read file content using cat command and capture it in a variable
        //            def SECRETKEY = sh(script: "cat $filePath", returnStdout: true).trim()

        //             // Debug: Print the content of the file
        //             echo "JSON Content: $SECRETKEY"
        //         }
        //     }
        // }
        stage("Login to ECR") {
            steps {
                script {
                    echo "This is test message for puling DEVOPS library"
                    qajobautomation.loginToEcr() 
                    qajobautomation.setPslCredentials(params.environment)

                }
            }
        }
      
        stage('Build') {
            steps {
                script {
                      testEnvironment = params.environment
                      currentBuild.description = testEnvironment + ": " + params.test
               }
              sh 'npm ci'
            }
        }
        stage("Debug File Structure") {  
            steps {  
                script {  
                    sh "docker run -v \$(pwd):/app -w /app ${nodeImage} ls -al /app"  
                    sh "docker run -v \$(pwd):/app -w /app ${nodeImage} ls -al /app/helpers/apiHelpers"  
                }  
            }  
        }  
        stage("Mount image, volumes and execution command") {    
            steps {    
                script {    
                    echo "This is test phase which mounts NODE Image and executes Test command"    
                    // Parameterize the location of the 'env' file based on the environment  
                    //def envFilePath = "psl/${params.environment}"  
                    def envFilePath = "psl/env"  
                    def additionalEnvVars = "export \$(cat ${envFilePath} | xargs)"  
                    // Existing environment variables  
                    //environmentVars = "${additionalEnvVars} && export DEBUG=true && export NODE_ENV=${params.environment}"  
                    environmentVars = "${additionalEnvVars}"  
                    echo "NODE_ENV: ${params.environment}"    
                    echo "environmentVars: ${environmentVars}"    
                    echo "params.test:  ${params.test}"
            
                    // Define the command to run based on the environment    
                    def commandToRun = "npm install"    
                    commandToRun += " && export NODE_ENV=${params.environment}"  
                    commandToRun += " && npm run jenkins-config-template"  
                    commandToRun += " && ${params.test}" 
            
                    // Check the environment and append the specific commands    
                    // if (params.environment == 'stage') {    
                    //     commandToRun += " && npm run load-secrets-stg" // Add command for 'stage'    
                    // } else if (params.environment == 'develop') {    
                    //     commandToRun += " && npm run load-secrets-dev" // Add command for 'develop'    
                    // } 
                    // else if (params.environment == 'aws-dev') {    
                    //     commandToRun += " && npm run load-secrets-dev" // Add command for 'develop'    
                    // }   
                    // // Add more else-if clauses for other environments if needed    
            
                    // Always run the test command regardless of the environment   
                    
                       
                        
                    // Log the command to be executed    
                    echo "Command to run: ${commandToRun}"    
            
                    // Execute the command within the Docker container  
                    // The environmentVars now includes the exported variables from the parameterized 'env' file  
                    sh "docker run -v \$(pwd):/app -w /app ${nodeImage} sh -c '${environmentVars} && ${commandToRun}'"    
                }    
            }    
        }  

      }
    
    post {

      always {
            archiveArtifacts artifacts: artifactsString, fingerprint: true
            // script {
            //       summary = junit 'junit.xml'
            //       slackJunit = "Passed: ${summary.passCount} - Failures: ${summary.failCount}"
            //   }
            // publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: true, reportDir: './report', reportFiles: 'test-report.html', reportName: 'HTML Report', reportTitles: ''])
             publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: true, reportDir: 'playwright-report', reportFiles: 'index.html', reportName: 'Playwright Report', reportTitles: ''])
           
      }

      // success {
      //       slackSend (color: '#74DF00', channel: params.slackChannel, message: "*${suiteName}* - Test Environment: *${params.environment.toUpperCase()}* \n*Tests*: ${params.test}\n*Success!* ${slackJunit} - <${env.BUILD_URL}|View Test Report> \nAutomation Branch: ${env.BRANCH_NAME}")
      // }

      // failure {
      //       slackSend (color: '#FFFF00', channel: params.slackChannel, message: "*${suiteName}* - Test Environment: *${params.environment.toUpperCase()}* \n*Tests*: ${params.test}\n*Unstable!* ${slackJunit} - <${env.BUILD_URL}|View Test Failures> \nAutomation Branch: ${env.BRANCH_NAME} ${replayLink}")
      // }
  }
}
    

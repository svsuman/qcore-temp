const { WebClient } = require('@slack/web-api');
const { decrypt } = require('./crypto');
const config = require('../config/develop.config.json');
const path = require('path');

const SLACK_CHANNEL = config.localConfig.slack.channels;
// Initialize Slack clients with tokens
const getSlackClient = (channelName) => {
    const tokenMap = {
        [config.localConfig.slack.channels[0]]: process.env.SLACK_BOT_TOKEN_1
        // Add more channel-token mappings as needed
    };

    const encryptedToken = tokenMap[channelName];
    if (!encryptedToken) {
        console.error(`No token found for channel: ${channelName}`);
        return null;
    }

    // Decrypt the token before using it
    const token = decrypt(encryptedToken);
    return new WebClient(token);
};

// Function to get test type from message
const getTestType = (message) => {
    // Look for test file path in the message
    const filePathMatch = message.match(/tests\/([^/]+)\//);
    if (filePathMatch) {
        const folderName = filePathMatch[1];
        // Capitalize first letter and keep rest lowercase
        return folderName.charAt(0).toUpperCase() + folderName.slice(1).toLowerCase();
    }
    return 'Rest'; // Default fallback
};

function parseTestResults(message) {
    const results = {
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0
    };

    // Parse the test output
    const lines = message.split('\n');
    for (const line of lines) {
        if (line.includes('passed')) {
            const match = line.match(/(\d+)\s+passed/);
            if (match) results.passed = parseInt(match[1]);
        }
        if (line.includes('failed')) {
            const match = line.match(/(\d+)\s+failed/);
            if (match) results.failed = parseInt(match[1]);
        }
        if (line.includes('skipped')) {
            const match = line.match(/(\d+)\s+skipped/);
            if (match) results.skipped = parseInt(match[1]);
        }
    }

    results.total = results.passed + results.failed + results.skipped;
    return results;
}

function calculatePassPercentage(testResults) {
    const { total, passed } = testResults;
    if (total === 0) return 0;
    return Math.round((passed / total) * 100);
}

function formatDuration(message) {
    const durationMatch = message.match(/(\d+(?:\.\d+)?s)/);
    return durationMatch ? durationMatch[1] : 'N/A';
}

function extractErrorDetails(message) {
    // Look for timeout errors
    const timeoutMatch = message.match(/"beforeAll" hook timeout of \d+ms exceeded\./);
    if (timeoutMatch) {
        return timeoutMatch[0];
    }

    // Look for assertion errors
    const assertionMatch = message.match(/Error: expect\(.*?\).*?\n.*?Received:.*?/s);
    if (assertionMatch) {
        return assertionMatch[0];
    }

    // Look for other error patterns
    const errorMatch = message.match(/Error Details:[\s\S]*?Command failed:[\s\S]*?(?=\n\s*\n|$)/i);
    return errorMatch ? errorMatch[0].trim() : null;
}

async function sendToSlack(channels, message, options = {}) {
    const defaults = {
        username: 'Playwright Test Bot',
        icon_emoji: ':robot_face:',
    };

    const config = { ...defaults, ...options };
    const timestamp = new Date().toLocaleString();

    // Parse test results from message
    const testResults = parseTestResults(message);
    const passPercentage = calculatePassPercentage(testResults);
    const duration = formatDuration(message);
    const testType = getTestType(message);
    console.log('Parsed test results:', testResults);

    // Extract error details if present
    const errorDetails = extractErrorDetails(message);

    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🎭 Playwright Test Execution Report",
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: getTestStatusMessage(testResults)
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: errorDetails ? 
                    "❌ *Error Status:*\n```" + errorDetails + "```" :
                    "✅ *Error Status:* No errors found"
            }
        },
        {
            type: "section",
            fields: [
                {
                    type: "mrkdwn",
                    text: "*:arrows_counterclockwise: Trigger Type:*\nOn Demand"
                },
                {
                    type: "mrkdwn",
                    text: `*:stopwatch: Duration:*\n${duration}`
                }
            ]
        },
        {
            type: "section",
            fields: [
                {
                    type: "mrkdwn",
                    text: `*:label: Tags:*\n${message.includes('Tags:') ? message.split('Tags:')[1].split('\n')[0].trim() : 'None'}`
                },
                {
                    type: "mrkdwn",
                    text: `*:mag: Test Type:*\n${testType}`
                }
            ]
        },
        {
            type: "section",
            fields: [
                {
                    type: "mrkdwn",
                    text: "*:clipboard: Test Category:*\nbackend"
                },
                {
                    type: "mrkdwn",
                    text: `*:dart: Environment:*\n${message.includes('Environment:') ? message.split('Environment:')[1].split('\n')[0].trim() : 'N/A'}`
                }
            ]
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "\n🔹 Test Summary:\n\n" +
                      `• 📊 Total Tests: ${testResults.total}\n` +
                      `• ✅ Passed: ${testResults.passed}\n` +
                      `• ❌ Failed: ${testResults.failed}\n` +
                      `• 😴 Skipped: ${testResults.skipped}\n` +
                      `• 📈 Pass Rate: ${passPercentage}%`
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                 text: `\n📂 Report Path: <file://playwright-report/index.html|playwright-report/index.html>`              
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "\n📄 Detailed Test Report:" + formatDetailedReport(message)
            }
        }
    ];

    // Add timestamp footer
    blocks.push(
        {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `🕒 *Executed at:* ${timestamp}`
                }
            ]
        }
    );

    // Send to each channel with its corresponding token
    for (const channel of channels) {
        const slackClient = getSlackClient(channel);
        if (!slackClient) {
            console.error(`Skipping channel ${channel} due to missing token`);
            continue;
        }

        try {
            const result = await slackClient.chat.postMessage({
                channel: channel,
                text: message,
                username: config.username,
                icon_emoji: config.icon_emoji,
                blocks: blocks.filter(block => block !== null)
            });

            if (result.ok) {
                console.log(`Message sent successfully to channel: ${channel}`);
            } else {
                console.error(`Failed to send message to channel ${channel}:`, result.error);
            }
        } catch (error) {
            console.error(`Error sending message to ${channel}:`, error.message);
        }
    }
}

module.exports = {
    sendToSlack
};

function getTestStatusMessage(testResults) {
    const { passed, failed, skipped, total } = testResults;
    
    if (failed === 0 && skipped === 0 && passed > 0) {
        return "✅ All Tests Passed:\n"
    } else if (failed > 0 && passed === 0 && skipped === 0) {
        return "❌ All Tests Failed:\n" 
    } else if ((passed > 0 || failed > 0) && skipped > 0) {
        return "🔄 Partial Success: Some Tests Skipped/Failed!\n" 
    } else if (failed > 0 && passed > 0) {
        return "❌ Some Tests Failed:\n" 
    } else if (skipped > 0 && passed === 0 && failed === 0) {
        return "😴 All Tests Skipped:\n" 
    }
    
    return "📢 Test Execution Complete";
}

function formatDetailedReport(message) {
    const lines = message.split('\n');
    const detailedReport = [];
    const { passed, failed, skipped } = parseTestResults(message);
    let testCount = 1;

    console.log('Parsed test counts:', { passed, failed, skipped });

    // Extract test information with their status
    const testResults = lines
        .filter(line => line.includes('[Chromium]') && line.includes('›'))
        .map(line => {
            // Debug log the raw line
            console.log('\nAnalyzing line:', line);

            // Extract test name
            const parts = line.split('›');
            const testName = parts[parts.length - 1].split('(')[0].trim();

            // Determine status with more detailed checks
            let status;
            const lineLC = line.toLowerCase();

            // Debug log all status indicators
            console.log('Status indicators:', {
                hasCheckmark: line.includes('✓'),
                hasCross: line.includes('✘'),
                hasError: line.includes('Error:'),
                isFailed: line.includes('failed')
            });

            // More comprehensive status detection
            if (line.includes('✓') || lineLC.includes('passed') || line.includes('--- passed')) {
                status = 'passed';
            } else if (
                line.includes('✘') || 
                lineLC.includes('failed') || 
                line.includes('--- failed') ||
                lineLC.includes('error')
            ) {
                status = 'failed';
            } else if (line.includes('○') || lineLC.includes('skipped') || line.includes('--- skipped')) {
                status = 'skipped';
            } else {
                // If we can't determine status, check if it has timing (suggesting it ran)
                const hasTimer = /\(\d+m?s\)/.test(line);
                status = hasTimer ? 'passed' : 'skipped';
            }

            console.log('Determined status for test:', { testName, status });
            return { name: testName, status };
        });

    console.log('Initial test results:', testResults);

    // Remove duplicates keeping the most significant status
    const uniqueTests = new Map();
    testResults.forEach(test => {
        const currentTest = uniqueTests.get(test.name);
        if (!currentTest) {
            uniqueTests.set(test.name, test);
        } else if (
            (currentTest.status === 'skipped' && test.status !== 'skipped') ||
            (currentTest.status === 'passed' && test.status === 'failed')
        ) {
            uniqueTests.set(test.name, test);
        }
    });

    // Convert back to array and sort by status
    const sortedTests = Array.from(uniqueTests.values()).sort((a, b) => {
        const statusOrder = { passed: 0, failed: 1, skipped: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
    });

    console.log('Final sorted tests:', sortedTests);

    // Generate detailed report
    sortedTests.forEach(test => {
        const emoji = test.status === 'passed' ? '✅' :
                     test.status === 'failed' ? '❌' : '😴';
        detailedReport.push(`• ${emoji} Test ${testCount}: ${test.name}`);
        testCount++;
    });

    return '\n' + detailedReport.join('\n\n');
}
 

function formatReportLinks(message) {
    return '*\n• HTML Report:/playwright-report/index.html';
}

function determineTestStatus(line) {
  const statusIndicators = {
    hasCheckmark: line.includes('✓'),
    hasCross: line.includes('✘'),
    hasError: line.includes('Error:'),
    isFailed: line.includes('failed')
  };

  const testName = line.match(/›\s([^(]+)/)?.[1]?.trim();
  
  if (!testName) return null;

  return {
    testName,
    status: statusIndicators.hasCross || statusIndicators.hasError || statusIndicators.isFailed 
      ? 'failed' 
      : statusIndicators.hasCheckmark 
        ? 'passed' 
        : 'unknown'
  };
}

function generateDetailedTestReport(tests) {
  return tests.map(test => {
    const icon = test.status === 'passed' ? ':white_check_mark:' : ':x:';
    return `• ${icon} ${test.name}`;
  }).join('\n');
}

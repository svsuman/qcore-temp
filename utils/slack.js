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
    const errorMatch = message.match(/Error Details:[\s\S]*?Command failed:[\s\S]*?(?=\n\s*\n|$)/i);
    const errorDetails = errorMatch ? errorMatch[0].trim() : null;

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
                    "❌ *Error Details:*\n```" + errorDetails + "```" :
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
    
    // Extract test names from the message
    const testNames = lines
        .filter(line => line.includes('test('))
        .map(line => {
            // Extract text between test(' and ', async
            const match = line.match(/test\('([^']+)'/);
            if (match) {
                const testName = match[1];
                // If includeTags is false, remove the tags from the test name
                if (!config.localConfig.testCases.includeTags) {
                    return testName.replace(/@\w+/g, '').trim();
                }
                return testName;
            }
            // Try alternative pattern if first one fails
            const altMatch = line.match(/test\(['"]([^'"]+)['"]/);
            if (altMatch) {
                const testName = altMatch[1];
                // If includeTags is false, remove the tags from the test name
                if (!config.localConfig.testCases.includeTags) {
                    return testName.replace(/@\w+/g, '').trim();
                }
                return testName;
            }
            return null;
        })
        .filter(name => name !== null); // Remove any null values
    
    console.log('Extracted test names:', testNames); // Debug log
    
    // Add passed tests with names
    for (let i = 0; i < passed; i++) {
        const testName = testNames[i] || `Test ${testCount}`;
        detailedReport.push(`• ✅ Test ${testCount}: ${testName}`);
        testCount++;
    }
    
    // Add failed tests with names
    for (let i = passed; i < passed + failed; i++) {
        const testName = testNames[i] || `Test ${testCount}`;
        detailedReport.push(`• ❌ Test ${testCount}: ${testName}`);
        testCount++;
    }
    
    // Add skipped tests with names
    for (let i = passed + failed; i < passed + failed + skipped; i++) {
        const testName = testNames[i] || `Test ${testCount}`;
        detailedReport.push(`• 😴 Test ${testCount}: ${testName}`);
        testCount++;
    }
    
    // Add extra newlines for spacing
    return '\n' + detailedReport.join('\n\n');
}

function formatReportLinks(message) {
    return '*\n• HTML Report:/playwright-report/index.html';
}

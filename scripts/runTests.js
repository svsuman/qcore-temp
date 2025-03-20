require('dotenv').config();
const { exec, spawn } = require('child_process');
const path = require('path');
const { sendToSlack } = require('../utils/slack');
const { decrypt } = require('../utils/crypto');

// Get profile from command line arguments
const getProfileName = () => {
    const args = process.argv.slice(2);
    const profileIndex = args.findIndex(arg => arg === '--profile' || arg === '-p');
    if (profileIndex !== -1 && args[profileIndex + 1]) {
        return args[profileIndex + 1];
    }
    return 'dev'; // default profile
};

// Get tags from command line arguments
const getTags = () => {
    const args = process.argv.slice(2);
    const grepIndex = args.findIndex(arg => arg.includes('--grep'));
    if (grepIndex !== -1 && args[grepIndex + 1]) {
        return args[grepIndex + 1].replace(/"/g, ''); // Remove quotes if present
    }
    return null;
};

// Load configurations
const globalConfig = require('../globalConfig');
const profileName = getProfileName();
let profileConfig;

try {
    profileConfig = require(`../config/${profileName}.config.json`);
    console.log(`Using ${profileName} profile configuration`);
} catch (err) {
    console.log(`No profiles/${profileName}.config.json found, using default configurations`);
    profileConfig = { localConfig: {} };
}

// Merge configurations
const finalConfig = {
    ...globalConfig.testConfig.defaultConfig,
    ...profileConfig.localConfig
};

// Function to handle Slack notifications
const sendSlackNotification = async (success, output, error = null) => {
    if (!finalConfig.slack) return;
    
    const { channels, notifyOnSuccess, notifyOnFailure } = finalConfig.slack;
    
    if ((!success && notifyOnFailure) || (success && notifyOnSuccess)) {
        const tags = getTags() || finalConfig.tag || 'None';
        const message = `
${output}
Environment: ${profileName.toUpperCase()}
Status: ${success ? 'SUCCESS' : 'FAILURE'}
Test Files: ${finalConfig.testFile || 'All Tests'}
Tags: ${tags}
Reports:
• HTML Report: playwright-report/index.html`;
        
        try {
            await sendToSlack(channels, message, {
                username: 'Playwright Test Reporter',
                icon_emoji: ':robot_face:'
            });
        } catch (err) {
            console.error('Failed to send Slack notification:', err);
        }
    }
};

// Build command
const buildTestCommand = () => {
    const { env, tag, headed, testFile, report } = finalConfig;
    
    let command = `NODE_ENV=${env} npx playwright test`;

    if (testFile) {
        command += ` ${testFile}`;
    }

    // Handle tags
    if (tag) {
        const tags = tag.split(',').map(t => t.trim());
        const grepPattern = tags.join('|');
        command += ` --grep "${grepPattern}"`;
    }

    if (headed) {
        command += ' --headed';
    }

    // Modify the report configuration section
    if (report) {
        // Set output directory if different from default
        if (report.outputDir) {
            command += ` --output ${report.outputDir}`;
        }

        // Keep video, screenshot and trace configurations
        if (report.videoMode) {
            command += ` --video on-first-retry`;
        }

        if (report.screenshotMode) {
            command += ` --screenshot only-on-failure`;
        }

        if (report.traceMode) {
            command += ` --trace retain-on-failure`;
        }
    }

    return command;
};

// Check if we're running in direct test mode (with --grep)
const isDirectTestMode = process.argv.some(arg => arg.includes('--grep'));

if (isDirectTestMode) {
    // Direct test mode - execute tests and send Slack notification
    const args = process.argv.slice(2);
    const grepIndex = args.findIndex(arg => arg.includes('--grep'));
    const grepPattern = args[grepIndex + 1];
    
    // Build the command with proper quoting
    const command = `NODE_ENV=${process.env.NODE_ENV} npx playwright test --grep "${grepPattern}"`;
    
    console.log('Executing command:', command);
    
    const proc = exec(command, { 
        env: {
            ...process.env,
            SLACK_BOT_TOKEN_1: decrypt(process.env.SLACK_BOT_TOKEN_1)
        }
    });
    
    let testOutput = '';
    
    proc.stdout.on('data', (data) => {
        testOutput += data;
        console.log(data);
    });
    
    proc.stderr.on('data', (data) => {
        testOutput += data;
        console.error(data);
    });
    
    proc.on('close', async (code) => {
        const success = code === 0;
        await sendSlackNotification(success, testOutput);
        process.exit(code);
    });
} else {
    // Normal mode - use existing configuration
    const command = buildTestCommand();
    const proc = exec(command, { 
        env: {
            ...process.env,
            SLACK_BOT_TOKEN_1: decrypt(process.env.SLACK_BOT_TOKEN_1),
            SLACK_BOT_TOKEN_2: decrypt(process.env.SLACK_BOT_TOKEN_2)
        }
    });
    
    let testOutput = '';
    
    proc.stdout.on('data', (data) => {
        testOutput += data;
        console.log(data);
    });
    
    proc.stderr.on('data', (data) => {
        testOutput += data;
        console.error(data);
    });
    
    proc.on('close', async (code) => {
        const success = code === 0;
        
        if (!success) {
            console.error(`Process exited with code ${code}`);
            await sendSlackNotification(false, testOutput, `Process exited with code ${code}`);
            process.exit(1);
        }
        
        await sendSlackNotification(true, testOutput);
    });
} 
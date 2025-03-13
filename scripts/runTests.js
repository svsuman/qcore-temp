require('dotenv').config();
const { exec, spawn } = require('child_process');
const path = require('path');
const { sendToSlack } = require('../utils/slack');

// Get profile from command line arguments
const getProfileName = () => {
    const args = process.argv.slice(2);
    const profileIndex = args.findIndex(arg => arg === '--profile' || arg === '-p');
    if (profileIndex !== -1 && args[profileIndex + 1]) {
        return args[profileIndex + 1];
    }
    return 'dev'; // default profile
};

// Load configurations
const globalConfig = require('../config/globalConfig');
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
        const message = `
${output}
Environment: ${profileName.toUpperCase()}
Status: ${success ? 'SUCCESS' : 'FAILURE'}
Test Files: ${finalConfig.testFile || 'All Tests'}
Tags: ${finalConfig.tag || 'None'}
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

    // Add report configurations
    if (report) {
        // Set output directory
        if (report.outputDir) {
            command += ` --output ${report.outputDir}`;
        }

        // Add reporters
        if (report.reporters && report.reporters.length > 0) {
            report.reporters.forEach(reporter => {
                if (Array.isArray(reporter)) {
                    const [name, options] = reporter;
                    if (options) {
                        const optionsStr = Object.entries(options)
                            .map(([key, value]) => `${key}=${value}`)
                            .join(',');
                        command += ` --reporter=${name}${optionsStr ? `=${optionsStr}` : ''}`;
                    } else {
                        command += ` --reporter=${name}`;
                    }
                } else {
                    command += ` --reporter=${reporter}`;
                }
            });
        }

        // Configure video recording (using correct option)
        if (report.videoMode) {
            command += ` --video on-first-retry`;
        }

        // Configure screenshots (using correct option)
        if (report.screenshotMode) {
            command += ` --screenshot only-on-failure`;
        }

        // Configure trace (using correct option)
        if (report.traceMode) {
            command += ` --trace retain-on-failure`;
        }
    }

    return command;
};

// Execute tests
const command = buildTestCommand();
console.log(`Executing: ${command}`);

const commandParts = command.split(' ');
const proc = spawn(commandParts[0], commandParts.slice(1), { shell: true });
let testOutput = '';

proc.stdout.on('data', (data) => {
    const output = data.toString();
    testOutput += output;
    process.stdout.write(output);
});

proc.stderr.on('data', (data) => {
    const output = data.toString();
    testOutput += output;
    process.stderr.write(output);
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
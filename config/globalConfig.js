const path = require('path');
const defaultConfig = require(path.resolve(__dirname, 'default.config.json'));

const testConfig = {
    // Environment configurations
    env: {
        default: 'develop',
        options: ['develop', 'stage', 'master', 'produEU', 'prodUS']
    },

    // Test execution configurations
    execution: {
        // Test file patterns to include
        testFiles: [
            'tests/**/*.test.js'
            // Add more test files as needed
        ],

        // Test tags for filtering
        tags: {
                smoke: '@smoke',
                healthCheck: '@HealthCheck',
            // Add more tags as needed
        },

        // Default reporter
        reporter: 'list',

        // Browser configurations
        browser: {
            headless: true,
            headed: false
        }
    },

    // API configurations (if needed)
    api: {
        timeout: 30000,
        retries: 2
    },

    // Default test configuration
    defaultConfig
};

// Helper functions
const getTestCommand = (options = {}) => {
    // Merge default config with provided options
    const finalOptions = {
        ...testConfig.defaultConfig,
        ...options
    };

    const {
        env = testConfig.env.default,
        tag = '',
        headed = false,
        testFile = ''
    } = finalOptions;

    let command = `NODE_ENV=${env} npx playwright test`;

    if (testFile) {
        command += ` ${testFile}`;
    }

    // Handle tags
    if (!tag) {
        // If no tag specified, use all tags from testConfig
        const configTags = Object.values(testConfig.execution.tags);
        if (configTags.length > 0) {
            const grepPattern = configTags.join('|');
            command += ` --grep "${grepPattern}"`;
        }
    } else {
        // Use specified tags
        const tags = tag.split(',').map(t => t.trim());
        const grepPattern = tags.join('|');
        command += ` --grep "${grepPattern}"`;
    }

    if (headed) {
        command += ' --headed';
    }

    return command;
};

module.exports = {
    testConfig,
    getTestCommand
}; 
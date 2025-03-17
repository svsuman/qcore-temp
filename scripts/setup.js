const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { encrypt } = require('../utils/crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function setup() {
    // Check if .env already exists
    if (!fs.existsSync('.env')) {
        // Read template
        const template = fs.readFileSync('.env.template', 'utf8');
        
        console.log('\n🔐 Setting up environment variables...');
        console.log('Please enter your Slack tokens:\n');

        // Get tokens from user and encrypt them
        const token1 = await new Promise(resolve => {
            rl.question('Enter SLACK_BOT_TOKEN_1: ', (token) => {
                resolve(encrypt(token));
            });
        });
        
        const token2 = await new Promise(resolve => {
            rl.question('Enter SLACK_BOT_TOKEN_2: ', (token) => {
                resolve(encrypt(token));
            });
        });

        // Replace placeholders with encrypted tokens
        const envContent = template
            .replace('<SLACK_TOKEN_1>', token1)
            .replace('<SLACK_TOKEN_2>', token2);

        // Write to .env file
        fs.writeFileSync('.env', envContent);
        console.log('\n✅ Environment setup complete! Tokens are encrypted.\n');
    }
    rl.close();
}

setup().catch(console.error); 
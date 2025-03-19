# discovery-playwright-automation

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Slack tokens:
   - `SLACK_BOT_TOKEN_1`: Token for first Slack channel
   - `SLACK_BOT_TOKEN_2`: Token for second Slack channel

Note: Never commit the `.env` file with real tokens.

npm install
npm install crypto-js

aws sso login --profile develop
npm run load-secrets-dev
npm run generate-key  
npm run setup


* To run multiple test cases with different tags, use the below format:

NODE_ENV=develop npx playwright test --grep "@HealthCheck|@Regression|@Smoke"



* To run Test cases having multiple tags and if I have to execute those cases which are having multiple tags and i want to ensure if it has all the tags, then only it should get executed:o
NODE_ENV=develop npx playwright test --grep "@HealthCheck.*@Regression.*@Smoke"

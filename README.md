

Note: Never commit the .env file with real tokens.

In the Library project:
1. rm -rf node_modules package-lock.json
2. npm cache clean --force
3. npm install

Once it's installed then 
4. npm pack

.tgz file will get generate


In the Service Project:
1. drag and drop the .tgz file 
2. npm cache clean --force
3. npm install
4. npm run generate-key
- entrypted file will be created 
5. npm run setup
- Token need to pass here for slack - "***********************************"
6. aws sso login --profile develop
7. npm run load-secrets-dev
8. ln -s $(pwd)/globalConfig.js node_modules/@skillsoft/qcore-library/globalConfig.js 
or 
ln -s $(pwd)/config node_modules/@skillsoft/qcore-library/config

9. npm run test:dev


Execute the tests in dev and report will be sent to the slack channel

To execute the cases using tags:

npm run test:dev -- --grep @run

To run multiple test cases with different tags, use the below format:

npm run test:dev -- --grep "@run|@HealthCheck|@Smoke"

To run Test cases having multiple tags and if I have to execute those cases which are having multiple tags and i want to ensure if it has all the tags, then only it should get executed:

npm run test:dev -- --grep "@run.@HealthCheck.@Smoke"

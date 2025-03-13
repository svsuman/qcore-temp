// testHelper.js  
const environments = require('./config');  
  
function getEnvironmentConfig() {  
  const env = process.env.TEST_ENV || 'develop'; // Default to 'develop' if not set  
  return environments[env];  
}  
  
module.exports = {  
  getEnvironmentConfig,  
};  

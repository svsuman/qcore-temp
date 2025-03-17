const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');

try {
    // Generate a new encryption key
    const key = CryptoJS.lib.WordArray.random(32).toString();
    
    // Get the root directory path
    const rootDir = path.resolve(__dirname, '..');
    
    // Write the key to .encryption_key in the root directory
    fs.writeFileSync(path.join(rootDir, '.encryption_key'), key);
    
    console.log('✅ New encryption key generated and saved to .encryption_key');
} catch (error) {
    console.error('❌ Error generating encryption key:', error.message);
    process.exit(1);
} 
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');

// Read or generate a secret key
const getSecretKey = () => {
    const keyPath = path.join(__dirname, '..', '.encryption_key');
    try {
        if (fs.existsSync(keyPath)) {
            return fs.readFileSync(keyPath, 'utf8');
        }
        // Generate new key if doesn't exist
        const newKey = CryptoJS.lib.WordArray.random(32).toString();
        fs.writeFileSync(keyPath, newKey);
        return newKey;
    } catch (error) {
        console.error('Error with encryption key:', error);
        process.exit(1);
    }
};

const SECRET_KEY = getSecretKey();

function encrypt(text) {
    try {
        const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

function decrypt(text) {
    try {
        const decrypted = CryptoJS.AES.decrypt(text, SECRET_KEY);
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

module.exports = {
    encrypt,
    decrypt
}; 
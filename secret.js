const crypto = require('crypto');

// Generate a random string of given length (e.g., 32 characters)
const generateSecretKey = (length) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

// Example: Generate a 32-character secret key for session
const sessionSecret = generateSecretKey(32);
console.log(sessionSecret);

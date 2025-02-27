const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Secret key for signing the JWT token (keep it secret and safe in production)
const JWT_SECRET = 'your_jwt_secret';

// Function to generate JWT token
function generateToken(username) {
    // Create a JWT token containing the username and any additional data
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' }); // Expires in 1 hour
    return token;
}

// Function to verify JWT token
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.username; // Return the username from the token
    } catch (err) {
        console.error('Token verification failed:', err);
        return null;
    }
}

module.exports = { generateToken, verifyToken };

const express = require('express');
const session = require('express-session');
const path = require('path'); // Node.js path module for file paths
const app = express();
const PORT = 3000;

// Middleware to serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Set up session middleware
app.use(session({
    secret: 'fc05247aab305a8b3cc5361c4b303845', // Replace with your actual secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Route to get the username from the session
app.get('/get-username', (req, res) => {
    if (req.session && req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ error: 'User not logged in' });
    }
});

// Dummy login route to set the session (for testing)
app.post('/login', (req, res) => {
    // For demonstration purposes, let's assume the username is provided in the request body
    req.session.username = req.body.username; // Set the username in the session
    res.json({ success: true });
});

// Dummy route to serve the HTML file (assuming login.html is in the public folder)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/login.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

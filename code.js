// server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Example endpoint to demonstrate usage of secret key
app.get('/api/secret', (req, res) => {
    const secretKey = process.env.SECRET_KEY;
    res.json({ secretKey });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
app.use(bodyParser.json());

const url = 'mongodb://localhost:27017';
const dbName = 'Internproject';

let db;

MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
        return console.error(err);
    }
    db = client.db(dbName);
    console.log(`Connected to database: ${dbName}`);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const collection = db.collection('login');

    collection.findOne({ email: username, password: password }, (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        // If login successful, you can do further processing here
        // For example, set a session, generate a token, etc.
        res.status(200).json({ message: 'Login successful' });
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});

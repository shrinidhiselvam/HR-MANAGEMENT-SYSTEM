const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');


const crypto = require('crypto');
const { Schema, model } = mongoose;
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');





// Initialize express app
const app = express();
const port = 3001; // Use a single port for the combined application

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const url = 'mongodb://localhost:27017';
const dbName = 'Internproject';
let db;

// Mongoose connection
mongoose.connect('mongodb://localhost:27017/Internproject', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected via Mongoose'))
    .catch(err => console.log('Mongoose connection error:', err));

    const UserSchema = new mongoose.Schema({
        name: String,
        email: String,
        password: String,
        resetToken: String,
        resetTokenExpiry: Date
    }, { collection: 'register' });

   

    const handleMongoError = (res, error) => {
        console.error('MongoDB Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    };
    
    const connectToMongoDB = async (req, res, next) => {
        try {
            if (!dbClient) {
                dbClient = new MongoClient(url, { useUnifiedTopology: true });
                await dbClient.connect();
            }
            req.db = dbClient.db(dbName);
            next();
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            res.status(500).json({ message: 'Error connecting to MongoDB' });
        }
    };

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'shrinidhi912@gmail.com',
            pass: 'tugt cpsr sixr pbni'  // Replace with the generated app password
        }
    });
    
    // MongoClient connection
    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(client => {
            db = client.db(dbName);
            console.log(`Connected to database: ${dbName}`);
        })
        .catch(err => {
            console.error('Failed to connect to the database:', err);
            process.exit(1); // Exit the process if there is a database connection error
        });
    // Serve the registration page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', (req, res) => {
    if (!db) {
        return res.status(500).json({ message: 'Database connection not established' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const collection = db.collection('register');

    collection.insertOne({ name, email, password })
        .then(result => {
            res.status(201).json({ message: 'User registered successfully' });
        })
        .catch(err => {
            res.status(500).json({ message: 'Database error', error: err });
        });
});

app.post('/login', (req, res) => {
    if (!db) {
        return res.status(500).json({ message: 'Database connection not established' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const collection = db.collection('register');

    collection.findOne({ name: username, password: password })
        .then(user => {
            if (user) {
                const loginCollection = db.collection('login');
                loginCollection.insertOne({ username: username, loginTime: new Date() })
                    .then(() => {
                        // Return username in the response
                        res.json({ message: 'Login successful', username: username });
                    })
                    .catch(err => {
                        res.status(500).json({ message: 'Database error', error: err });
                    });
            } else {
                res.status(401).json({ message: 'Invalid username or password' });
            }
        })
        .catch(err => {
            res.status(500).json({ message: 'Database error', error: err });
        });
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000; // Token expires in 1 hour
        await user.save();

        const resetUrl = `http://localhost:${port}/reset-password.html?token=${resetToken}`;

        const mailOptions = {
            from: 'shrinidhi912@gmail.com',
            to: user.email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click here to reset your password: ${resetUrl}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Error sending email' });
            }
            res.status(200).json({ success: true, message: 'Password reset link sent to your email' });
        });

    } catch (error) {
        console.error('Error processing forgot password request:', error);
        res.status(500).json({ success: false, message: 'Error processing request' });
    }
});

app.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    try {
        const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error('Error processing reset password request:', error);
        res.status(500).json({ success: false, message: 'Error processing request' });
    }
});
app.get('/get-username', (req, res) => {
    // Assuming you store the username in the session
    if (req.session && req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ error: 'User not logged in' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.status(200).json({ message: 'Logout successful' });
    });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

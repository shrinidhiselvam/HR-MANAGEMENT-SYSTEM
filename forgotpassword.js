const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3006;

app.use(bodyParser.json());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/Internproject', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    resetToken: String,
    resetTokenExpiry: Date
}, { collection: 'register' });

const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'divya2004.23@gmail.com',//replace ur mail id 
        pass: 'qxek jzvf xugb izvb'  // Replace with the generated app password
    }
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
            from: 'divya2004.23@gmail.com',
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

        user.password = password; // You should hash the password before saving
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'resetpass.html'));
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

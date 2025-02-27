const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));  // Serve static files from the 'public' directory

mongoose.connect('mongodb://localhost:27017/registration', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    country: String,
    mobile: String,
    dob: Date,
    age: Number,
    gender: String,
    address: String,
    experience: Number,
    preferredBranch: String,
    bloodGroup: String,
    aadhar: String,
    pan: String,
    resumePath: String,
    tempId: String
});

const User = mongoose.model('User', userSchema);

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.post('/register', upload.single('resume'), (req, res) => {
    const userData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        country: req.body.country,
        mobile: req.body.mobile,
        dob: new Date(req.body.dob),
        age: req.body.age,
        gender: req.body.gender,
        address: req.body.address,
        experience: req.body.experience,
        preferredBranch: req.body.preferredBranch,
        bloodGroup: req.body.bloodGroup,
        aadhar: req.body.aadhar,
        pan: req.body.pan,
        resumePath: req.file.path,
        tempId: req.body.tempId
    };

    const user = new User(userData);
    user.save()
        .then(() => res.status(201).send('User registered successfully'))
        .catch((err) => res.status(400).send(err.message));
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

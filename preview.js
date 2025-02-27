const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/registration', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    email: String,
    door: String,
    street: String,
    city: String,
    district: String,
    state: String,
    country: String,
    mobile: String,
    dob: String,
    age: Number,
    gender: String,
    exp: Number,
    course: String,
    bloodgroup: String,
    aadhar: String,
    pan: String,
    temporaryID: String
});

const User = mongoose.model('User', userSchema);

// Endpoint to handle form submission
app.post('/sign_up', async (req, res) => {
    const userData = new User(req.body);
    try {
        const savedUser = await userData.save();
        res.json(savedUser);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Endpoint to get user data by ID
app.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.json(user);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.listen(port, () => {
    console.log('Server is running on http://localhost:${port}');
});
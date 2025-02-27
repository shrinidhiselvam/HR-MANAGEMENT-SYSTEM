const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Internproject', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Schema for personal user information
const userSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    email: String,
    mobile: String,
    dob: String,
    gender: String,
    door: String,
    street: String,
    city: String,
    district: String,
    state: String,
    country: String,
    exp: String,
    course: String,
    bloodgroup: String,
    aadhar: String,
    pan: String
}, { collection: 'Personal_details' });

const User = mongoose.model('User', userSchema, 'Personal_details');

// Schema for onboard survey data
const onboardSurveySchema = new mongoose.Schema({
    jobRole: String,
    training: String,
    managerSupport: String,
    resources: String,
    overallExperience: String
}, { collection: 'onboard_survey' });

const OnboardSurvey = mongoose.model('OnboardSurvey', onboardSurveySchema);

// Schema for engagement survey data
const engagementSurveySchema = new mongoose.Schema({
    currentRole: Number,
    valuedByColleagues: Number,
    workplaceCulture: Number,
    companyGoals: Number,
    recognizedForContributions: Number,
    learningDevelopment: Number,
    workLifeBalance: Number,
    supervisorEffectiveness: Number,
    companyMissionValues: Number,
    leadershipConfidence: Number
}, { collection: 'engagement_survey' });

const EngagementSurvey = mongoose.model('EngagementSurvey', engagementSurveySchema);

// Schema for exit survey data
const exitSurveySchema = new mongoose.Schema({
    reasonForLeaving: String,
    feedback: String,
    suggestions: String
}, { collection: 'exit_survey' });

const ExitSurvey = mongoose.model('ExitSurvey', exitSurveySchema);

// Route for saving user data and redirecting to preview
app.post("/sign_up", async (req, res) => {
    const userData = req.body;
    const newUser = new User(userData);

    try {
        await newUser.save();
        console.log("Record inserted successfully");
        res.redirect(`/preview/${newUser._id}`);
    } catch (err) {
        console.error("Error inserting record:", err);
        res.status(500).send("Error in inserting record");
    }
});

// Route for fetching user data for preview
app.get('/preview/:id', async (req, res) => {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).send("Invalid User ID");
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send("User not found");
        }
        res.json(user);
    } catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).send("Error fetching data");
    }
});

// Route to handle onboard survey submissions
app.post('/submitOnboardSurvey', async (req, res) => {
    try {
        const surveyData = req.body;
        const newSurvey = new OnboardSurvey(surveyData);
        await newSurvey.save();
        res.status(200).send('Onboard survey data saved successfully');
    } catch (err) {
        console.error('Error saving onboard survey data:', err);
        res.status(500).send('Error saving onboard survey data');
    }
});

// Route to handle engagement survey submissions
app.post('/submitEngagementSurvey', async (req, res) => {
    try {
        const surveyData = req.body; 
        const survey = new EngagementSurvey(surveyData);
        await survey.save();
        res.status(200).send('Engagement survey submitted successfully');
    } catch (error) {
        console.error('Error saving engagement survey data:', error);
        res.status(500).send('Error submitting engagement survey');
    }
});

// Route to handle exit survey submissions
app.post('/submitExitSurvey', async (req, res) => {
    try {
        const surveyData = req.body;
        const newSurvey = new ExitSurvey(surveyData);
        await newSurvey.save();
        res.status(200).send('Exit survey submitted successfully');
    } catch (err) {
        console.error('Error saving exit survey data:', err);
        res.status(500).send('Error submitting exit survey');
    }
});

// Serve the HTML file for personal details
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "per1.html"));
});

// Serve the preview page
app.get("/preview", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "preview.html"));
});

// Serve the HTML file for onboard survey
app.get("/onboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "onboard.html"));
});

// Serve the HTML file for engagement survey
app.get("/engagement", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "engagement.html"));
});

// Serve the HTML file for exit survey
app.get("/exit", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "exit.html"));
});

// Route for registering a new user
app.post('/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        const savedUser = await newUser.save();
        res.status(201).json({ message: 'Record inserted successfully', userId: savedUser._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

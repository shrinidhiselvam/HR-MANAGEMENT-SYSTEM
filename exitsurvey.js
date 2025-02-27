const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = 3007;

// Connect to MongoDB using the specified database name
mongoose.connect('mongodb://localhost:27017/Internproject', { useNewUrlParser: true, useUnifiedTopology: true });

// Define Survey Schema
const SurveySchema = new mongoose.Schema({
    customQuestions: [{ question: String, answer: Number }]
});

// Create Survey model
const Survey = mongoose.model('exit_survey', SurveySchema);

// Middleware setup
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the HTML file when the root URL is requested
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exit.html'));
});

// Handle the survey form submission
app.post('/submitSurvey', async (req, res) => {
    try {
        const surveyData = req.body; // Assuming the data is already in JSON format

        // Extract custom questions from surveyData and remove them from main surveyData
        const customQuestions = [];
        for (const key in surveyData) {
            if (surveyData.hasOwnProperty(key) && key.startsWith('custom_')) {
                const question = key.replace('custom_', '').replace(/_/g, ' '); // Restore original question text
                const answer = surveyData[key];
                customQuestions.push({ question, answer });
                delete surveyData[key]; // Remove custom question from main survey data
            }
        }

        // Create a new Survey document with both standard and custom questions
        const survey = new Survey({
            ...surveyData,
            customQuestions
        });

        // Save the survey document to MongoDB
        await survey.save();
        res.status(200).send('Survey submitted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error submitting survey');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);

});

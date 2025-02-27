const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/Internproject', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// Define the Job schema
const jobSchema = new mongoose.Schema({
    jobTitle: String,
    jobDescription: String,
    skills: String,
    qualifications: String,
    mode: String,
    type: String,
    salaryMin: Number,
    salaryMax: Number
});

// Create the Job model
const Job = mongoose.model('Job', jobSchema);

// Middleware for parsing JSON data
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Save job details
app.post('/save-job', async (req, res) => {
    const jobDetails = new Job(req.body);
    try {
        const savedJob = await jobDetails.save();
        res.status(201).json(savedJob);
    } catch (error) {
        console.error('Error saving job details:', error);
        res.status(500).json({ error: 'Error saving job details' });
    }
});

// Get all job details
app.get('/get-jobs', async (req, res) => {
    try {
        const jobs = await Job.find({});
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching job details:', error);
        res.status(500).json({ error: 'Error fetching job details' });
    }
});

// Remove a job
app.delete('/remove-job/:id', async (req, res) => {
    const jobId = req.params.id;
    try {
        const removedJob = await Job.findByIdAndDelete(jobId);
        if (!removedJob) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(removedJob);
    } catch (error) {
        console.error('Error removing job:', error);
        res.status(500).json({ error: 'Error removing job' });
    }
});

// Serve the jobdetails.html file at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'jobdetails.html'));
});

// Serve the viewjobdetails.html file
app.get('/viewjobdetails', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewjobdetails.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

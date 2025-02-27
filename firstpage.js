const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');


const crypto = require('crypto');
const { Schema, model } = mongoose;
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');





// Initialize express app
const app = express();
const port = 3000; // Use a single port for the combined application

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



// Define Mongoose schemas and models
const SalarySchema = new mongoose.Schema({
    employeeName: String,
    basicSalary: Number,
    tds: Number,
    netSalary: Number,
    salaryChanges: Number,
    maxIncrement: Number
}, { collection: 'salarydetails' });

const SalaryChangeSchema = new mongoose.Schema({
    salaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salary' },
    changeType: String,
    percentageChange: Number,
    newSalary: Number,
    remarks: String,
    date: { type: Date, default: Date.now }
}, { collection: 'salarychanges' });

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    resetToken: String,
    resetTokenExpiry: Date
}, { collection: 'register' });
const registrationSchema = new mongoose.Schema({
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
    exp: String,
    prev: String,
    org: String,
    course: String,
    bloodgroup: String,
    aadhar: String,
    pan: String,
    resume: String,
    tempId: String
}, { collection: 'personal_details' });

const Registration = mongoose.model('Registration', registrationSchema);

let dbClient; // MongoDB client instance

// Middleware to connect to MongoDB
// Middleware to handle MongoDB errors


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

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize Multer with defined storage
const upload = multer({ storage: storage });

// Serve per1.html using GET request
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'per1.html'));
});

// Route to handle form submission
app.post('/submit-form', upload.single('resume'), async (req, res) => {
    const formData = req.body;
    formData.resume = req.file ? req.file.path : '';

    try {
        // Generate tempId based on course
        formData.tempId = await generateTempId(formData.course);

        // Check if there's an existing record with the new email
        let existingDataNewEmail = await Registration.findOne({ email: formData.email });

        if (existingDataNewEmail) {
            // If a record with the new email already exists, update it
            Object.assign(existingDataNewEmail, formData);
            await existingDataNewEmail.save();
            console.log('Existing record updated successfully with new email:', existingDataNewEmail);

            // Delete the old record if email has changed
            if (req.body.email !== formData.email) {
                await Registration.deleteOne({ email: req.body.email });
                console.log('Old record deleted successfully.');
            }

            return res.send('Form data saved successfully.');
        } else {
            // Check if there's an existing record with the old email
            let existingDataOldEmail = await Registration.findOne({ email: req.body.email });

            if (existingDataOldEmail) {
                // Update existing record with new data and new email
                Object.assign(existingDataOldEmail, formData);
                existingDataOldEmail.email = formData.email; // Update email
                await existingDataOldEmail.save();
                console.log('Existing record updated successfully with new data and new email:', existingDataOldEmail);

                // No need to delete old record because email has been updated in place

                return res.send('Form data saved successfully.');
            } else {
                // Create a new record with the new email
                const newRecord = new Registration(formData);
                await newRecord.save();
                console.log('New record saved successfully:', newRecord);

                // Delete old record if it exists (email changed)
                if (req.body.email && req.body.email !== formData.email) {
                    await Registration.deleteOne({ email: req.body.email });
                    console.log('Old record deleted successfully.');
                }

                return res.send('Form data saved successfully.');
            }
        }
    } catch (err) {
        console.error('Error saving form data:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to display success page with fetched data
// Route to display success page with fetched data
app.get('/sign_up successful', async (req, res) => {
    try {
        const tempId = req.query.tempId; // Assuming tempId is passed as query parameter

        if (!tempId) {
            return res.status(400).send('Missing tempId parameter');
        }

        // Fetch data based on tempId if needed
        const registrationData = await Registration.findOne({ tempId });

        if (!registrationData) {
            return res.status(404).send('Registration data not found');
        }

        // Render success page with tempId and fetched data
        res.sendFile(path.join(__dirname, 'public', 'sign_up successful.html'));

    } catch (err) {
        console.error('Error fetching registration data:', err);
        res.status(500).send('Internal Server Error');
    }
});
// Serve sign_up successful.html using GET request
app.get('/sign_up successful', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sign_up successful.html'));
});



// Generate a unique tempId based on course
async function generateTempId(course) {
    const coursePrefix = course.slice(0, 3).toUpperCase();
    const count = await Registration.countDocuments({ course });

    return `${coursePrefix}${String(count + 1).padStart(3, '0')}`;
}


const Salary = mongoose.model('Salary', SalarySchema);
const SalaryChange = mongoose.model('SalaryChange', SalaryChangeSchema);
const User = mongoose.model('User', UserSchema);


// Nodemailer setup
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

// Multer Configuration for File Uploads


// Create a new salary record
app.post('/api/salaries', async (req, res) => {
    try {
        const salary = new Salary(req.body);
        await salary.save();
        res.status(201).json({ id: salary._id, ...req.body });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Fetch past salary changes for a specific salary ID
app.get('/api/salaryChanges/:salaryId', async (req, res) => {
    try {
        const { salaryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(salaryId)) {
            return res.status(400).send('Invalid salaryId');
        }
        const changes = await SalaryChange.find({ salaryId }).sort({ date: -1 });
        res.status(200).json(changes);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add a new salary change
app.post('/api/salaryChanges', async (req, res) => {
    try {
        const change = new SalaryChange(req.body);
        await change.save();
        res.status(201).json(change);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update salary details
app.put('/api/salaries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedSalary = await Salary.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json(updatedSalary);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Routes for user registration and authentication

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

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.redirect('/applicant.html');
});

app.post('/saveApplicant', async (req, res) => {
    const client = new MongoClient(url, { useUnifiedTopology: true });

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('applicants');

        const applicant = {
            ...req.body
        };

        await collection.insertOne(applicant);
        res.status(200).send('Applicant saved successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving applicant');
    } finally {
        await client.close();
    }
});

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


app.get('/getApplicants', async (req, res) => {
    const client = new MongoClient(url, { useUnifiedTopology: true });

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('applicants');
        const applicants = await collection.find().toArray();
        res.status(200).json(applicants);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving applicants');
    } finally {
        await client.close();
    }
});


const SurveySchema = new mongoose.Schema({
    customQuestions: [{ question: String, answer: Number }]
});

// Create Survey models
const OnboardSurvey = mongoose.model('OnboardSurvey', SurveySchema);
const EngagementSurvey = mongoose.model('EngagementSurvey', SurveySchema);
const ExitSurvey = mongoose.model('ExitSurvey', SurveySchema);

// Middleware setup
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve a default HTML page for the root URL


// Serve the HTML files for different surveys
app.get('/onboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'onboard.html'));
});

app.get('/engagement', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'engagement.html'));
});

app.get('/exit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exit.html'));
});

// Function to handle survey submissions
const handleSurveySubmission = async (req, res, SurveyModel) => {
    try {
        const surveyData = req.body;
        console.log('Received survey data:', surveyData); // Log the received data

        // Extract custom questions from surveyData
        const customQuestions = [];
        for (const key in surveyData) {
            if (surveyData.hasOwnProperty(key) && key.startsWith('custom_')) {
                const question = key.replace('custom_', '').replace(/_/g, ' '); // Restore original question text
                const answer = parseInt(surveyData[key], 10); // Convert answer to number
                customQuestions.push({ question, answer });
            }
        }

        console.log('Processed custom questions:', customQuestions); // Log custom questions

        // Create a new Survey document with custom questions
        const survey = new SurveyModel({
            customQuestions
        });

        // Save the survey document to MongoDB
        await survey.save();
        res.status(200).send('Survey submitted successfully');
    } catch (error) {
        console.error('Error saving survey:', error); // Log error details
        res.status(500).send('Error submitting survey');
    }
};

// Handle survey form submissions for different surveys
app.post('/OnboardSurvey', (req, res) => handleSurveySubmission(req, res, OnboardSurvey));
app.post('/EngagementSurvey', (req, res) => handleSurveySubmission(req, res, EngagementSurvey));
app.post('/ExitSurvey', (req, res) => handleSurveySubmission(req, res, ExitSurvey));

// Define Mongoose schemas and models
// MongoDB model (example schema)
const RoundSchema = new Schema({
    marks: [Number],  // Array to store marks for each section
    cumulativeMarks: Number,
    grade: String,
    status: { type: String, default: 'Active' }
}, { _id: false });

const ApplicantSchema = new Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    currentRound: { type: Number, default: 1 },
    status: { type: String, default: 'Active' },
    rounds: {
        type: Map,
        of: RoundSchema
    },
    roleToken: { type: String }, // Token for role confirmation
    roleTokenExpiry: { type: Date }, // Expiry time for the token
    roleConfirmed: { type: Boolean, default: false } // Status of role confirmation
}, { collection: 'applicants' });

const Applicant = model('Applicant', ApplicantSchema);

const RoundDetailsSchema = new Schema({
    role: { type: String, required: true },
    rounds: [{ name: String, description: String }]
});

const Round = mongoose.model('Round', RoundDetailsSchema);

const GradingSystemSchema = new Schema({
    role: { type: String, required: true },
    gradingSystem: [{ grade: String, minMarks: Number }]
});

const GradingSystem = mongoose.model('GradingSystem', GradingSystemSchema);


module.exports = Applicant;
// Move to next round endpoint
// Server-side code

app.post('/assignRole', async (req, res) => {
    const { applicantId, selectedRole } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(applicantId)) {
            return res.status(400).json({ success: false, message: 'Invalid applicant ID format' });
        }

        // Find applicant by ID
        const applicant = await Applicant.findById(applicantId).exec();
        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        // Generate role token
        const roleToken = crypto.randomBytes(32).toString('hex');
        applicant.role = selectedRole;
        applicant.roleToken = roleToken;
        applicant.roleTokenExpiry = Date.now() + 3600000; // Token expires in 1 hour

        await applicant.save();

        // Send confirmation email
        const roleUrl = `http://localhost:${port}/confirm-role?token=${roleToken}`;

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: applicant.email,
            subject: 'Role Assignment Confirmation',
            html: `
                <p>Dear ${applicant.name},</p>
                <p>You have been assigned the role of <strong>${selectedRole}</strong>.</p>
                <p>Please confirm your acceptance by clicking one of the links below:</p>
                <p><a href="${roleUrl}&accept=true">Accept offer</a></p>
                <p><a href="${roleUrl}&accept=false">Reject offer</a></p>
                <p>Best Regards,<br>Your HR Team</p>
            `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Error sending email' });
            }
            res.status(200).json({ success: true, message: 'Role assigned successfully. Confirmation email sent.' });
        });
    } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({ success: false, message: 'Error assigning role', error: error.message });
    }
});

app.get('/confirm-role', async (req, res) => {
    const { token, accept } = req.query;

    try {
        const applicant = await Applicant.findOne({ roleToken: token, roleTokenExpiry: { $gt: Date.now() } });
        if (!applicant) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        applicant.roleConfirmed = accept === 'true';
        applicant.roleToken = null; // Clear token after use
        applicant.roleTokenExpiry = null; // Clear expiry after use
        await applicant.save();

        res.send(`
            <h1>Role Confirmation</h1>
            <p>Your decision to ${accept === 'true' ? 'accept' : 'reject'} the role has been recorded.</p>
        `);
    } catch (error) {
        console.error('Error confirming role:', error);
        res.status(500).send('Error confirming role');
    }
});
app.get('/getFailedApplicants', async (req, res) => {
    const { role } = req.query;

    try {
        const failedApplicants = await Applicant.find({
            role,
            $or: [
                { 'rounds.round1.status': 'Failed' },
                { 'rounds.round2.status': 'Failed' },
                { 'rounds.round3.status': 'Failed' } // Add more rounds if necessary
            ]
        }, 'name email role rounds');

        console.log('Failed Applicants:', failedApplicants); // Log for debugging

        const failedResponse = failedApplicants.map(applicant => {
            let failedRound = '';
            for (const [round, data] of Object.entries(applicant.rounds)) {
                if (data.status === 'Failed') {
                    failedRound = round;
                    break;
                }
            }
            return {
                name: applicant.name,
                email: applicant.email,
                role: applicant.role,
                status: 'Failed',
                failedRound
            };
        });

        res.json(failedResponse);
    } catch (error) {
        console.error('Error fetching failed applicants:', error);
        res.status(500).send('Error fetching failed applicants');
    }
});



// Endpoint to get sorted applicants
app.get('/marks/sortedApplicants', connectToMongoDB, async (req, res) => {
    try {
        const collection = req.db.collection('applicants');
        const sortedApplicants = await collection.find().sort({ cumulativeMarks: -1 }).toArray();
        res.status(200).json(sortedApplicants);
    } catch (error) {
        console.error('Error fetching sorted applicants:', error);
        res.status(500).json({ message: 'Error fetching sorted applicants' });
    }
});








app.post('/marks/submitRound1Marks', connectToMongoDB, async (req, res) => {
    console.log('Received data:', req.body);

    const { role, data } = req.body;
    console.log('Role:', role);
    console.log('Data:', data);

    if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: 'Invalid data received' });
    }

    try {
        const collection = req.db.collection('applicants');

        const updatePromises = data.map(applicant => {
            return collection.updateOne(
                { _id: new ObjectId(applicant._id) },
                {
                    $set: {
                        'rounds.round1.marks': applicant.marks,
                        'rounds.round1.cumulativeMarks': applicant.cumulativeMarks,
                        'rounds.round1.grade': applicant.grade,
                        'rounds.round1.status': applicant.pass ? 'Passed' : 'Failed'
                    }
                }
            );
        });

        const results = await Promise.all(updatePromises);
        results.forEach(result => console.log('Update Result:', result));

        res.status(200).json({ message: 'Marks submitted successfully' });
    } catch (error) {
        console.error('Error submitting marks:', error);
        res.status(500).json({ message: 'Error submitting marks' });
    }
});
// Route to get applicants for Round 2
app.get('/getApplicantsForRound2', connectToMongoDB, async (req, res) => {
    const { role } = req.query;
    try {
        console.log(`Fetching Round 2 applicants for role: ${role}`);

        const collection = req.db.collection('applicants');
        const applicants = await collection.find({
            role,
            currentRound: 1,
            'rounds.round1.status': 'Passed'
        }).toArray();

        console.log('Applicants for Round 2:', applicants);

        if (applicants.length > 0) {
            res.json(applicants);
        } else {
            res.status(404).send('No applicants found for Round 2');
        }
    } catch (error) {
        console.error('Error fetching applicants for Round 2:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Fetch applicants for Round 3 based on Round 2 status
app.get('/getApplicantsForRound3', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        console.log(`Fetching Round 3 applicants for role: ${role}`);

        const collection = req.db.collection('applicants');
        const applicants = await collection.find({
            role,
            currentRound: 2,
            'rounds.round2.status': 'Passed' // Ensure Round 2 is passed to qualify for Round 3
        }).toArray();

        console.log('Applicants for Round 3:', applicants);

        if (applicants.length > 0) {
            res.json(applicants);
        } else {
            res.status(404).send('No applicants found for Round 3');
        }
    } catch (error) {
        console.error('Error fetching applicants for Round 3:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Submit marks for Round 3
app.post('/marks/submitRound3Marks', connectToMongoDB, async (req, res) => {
    const { role, data } = req.body;

    try {
        // Fetch grading details for the specified role
        const gradingDetails = await req.db.collection('gradingSystems').findOne({ role });

        if (!gradingDetails || !gradingDetails.gradingSystem || !Array.isArray(gradingDetails.gradingSystem)) {
            console.error(`Invalid grading system for role: ${role}`);
            return res.status(404).json({ message: 'Invalid grading system' });
        }

        const gradingLevels = gradingDetails.gradingSystem;

        // Prepare bulk operations to update applicants' round 3 details
        const bulkOps = data.map(({ applicantId, sections }) => {
            if (!Array.isArray(sections)) {
                throw new Error(`Invalid sections data for applicant ${applicantId}`);
            }

            // Calculate cumulative marks and grade
            const cumulativeMarks = sections.reduce((total, section) => total + (section.marks || 0), 0);
            const grade = calculateGrade(cumulativeMarks, gradingLevels);

            return {
                updateOne: {
                    filter: { _id: new ObjectId(applicantId) },
                    update: {
                        $set: {
                            'rounds.round3.marks': sections.map(section => section.marks || 0),
                            'rounds.round3.cumulativeMarks': cumulativeMarks,
                            'rounds.round3.grade': grade,
                            'rounds.round3.status': grade !== 'F' ? 'Passed' : 'Failed',
                            'currentRound': 3
                        }
                    }
                }
            };
        });

        // Perform bulk write operation to update applicants
        const result = await req.db.collection('applicants').bulkWrite(bulkOps);

        if (result.result.ok !== 1) {
            return res.status(500).send('Error updating marks');
        }

        res.send('Marks submitted successfully for Round 3');
    } catch (error) {
        console.error('Error submitting round 3 marks:', error);
        res.status(500).send('Error submitting round 3 marks');
    }
});
// Endpoint to get failed applicants
app.get('/getFailedApplicants', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        console.log(`Fetching failed applicants for role: ${role}`);

        const collection = req.db.collection('applicants');
        
        // Fetch applicants who failed in any round
        const failedApplicants = await collection.find({
            role,
            $or: [
                { 'rounds.round1.status': 'Failed' },
                { 'rounds.round2.status': 'Failed' },
                { 'rounds.round3.status': 'Failed' } // Add more rounds as necessary
            ]
        }).toArray();

        console.log('Failed Applicants:', failedApplicants);

        // Map the results to include the round they failed in
        const failedResponse = failedApplicants.map(applicant => {
            let failedRound = '';
            for (const [round, data] of Object.entries(applicant.rounds)) {
                if (data.status === 'Failed') {
                    failedRound = round;
                    break;
                }
            }
            return {
                name: applicant.name,
                email: applicant.email,
                role: applicant.role,
                status: 'Failed',
                failedRound
            };
        });

        if (failedResponse.length > 0) {
            res.json(failedResponse);
        } else {
            res.status(404).send('No failed applicants found');
        }
    } catch (error) {
        console.error('Error fetching failed applicants:', error);
        res.status(500).send('Internal Server Error');
    }
});




// Function to calculate the grade based on grading system and marks
const calculateGrade = (marks, gradingSystem) => {
    for (const level of gradingSystem) {
        if (marks >= level.min && marks <= level.max) {
            return level.label;
        }
    }
    return gradingSystem[gradingSystem.length - 1].label; // Return the lowest grade if marks are below all levels
};

app.post('/marks/submitRound2Marks', connectToMongoDB, async (req, res) => {
    const { role, data } = req.body;

    try {
        // Fetch grading details for the specified role
        const gradingDetails = await req.db.collection('gradingSystems').findOne({ role });

        if (!gradingDetails || !gradingDetails.gradingSystem || !Array.isArray(gradingDetails.gradingSystem)) {
            console.error(`Invalid grading system for role: ${role}`);
            return res.status(404).json({ message: 'Invalid grading system' });
        }

        const gradingLevels = gradingDetails.gradingSystem;

        // Prepare bulk operations to update applicants' round 2 details
        const bulkOps = data.map(({ applicantId, sections }) => {
            if (!Array.isArray(sections)) {
                throw new Error(`Invalid sections data for applicant ${applicantId}`);
            }

            // Calculate cumulative marks and grade
            const cumulativeMarks = sections.reduce((total, section) => total + (section.marks || 0), 0);
            const grade = calculateGrade(cumulativeMarks, gradingLevels);

            return {
                updateOne: {
                    filter: { _id: new ObjectId(applicantId) },
                    update: {
                        $set: {
                            'rounds.round2.marks': sections.map(section => section.marks || 0),
                            'rounds.round2.cumulativeMarks': cumulativeMarks,
                            'rounds.round2.grade': grade,
                            'rounds.round2.status': grade !== 'F' ? 'Passed' : 'Failed',
                            'currentRound': 2
                        }
                    }
                }
            };
        });

        // Perform bulk write operation to update applicants
        const result = await req.db.collection('applicants').bulkWrite(bulkOps);

        if (result.result.ok !== 1) {
            return res.status(500).send('Error updating marks');
        }

        res.send('Marks submitted successfully');
    } catch (error) {
        console.error('Error submitting round 2 marks:', error);
        res.status(500).send('Error submitting round 2 marks');
    }
});



// Example route using handleMongoError
app.get('/getRoundDetails', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Missing role information' });
        }

        const roundsCollection = req.db.collection('rounds');
        const roundDetails = await roundsCollection.findOne({ role });

        if (!roundDetails) {
            return res.status(404).json({ message: 'Round details not found for the role' });
        }

        res.status(200).json(roundDetails);
    } catch (error) {
        console.error('Error fetching round details:', error); // Log detailed error
        handleMongoError(res, error); // Handle MongoDB errors
    }
});

// Define Mongoose schemas and models


// Schema for rounds collection
const roundSchema = new Schema({
    role: { type: String, required: true },
    rounds: [{ name: String, description: String }]
});


// New endpoint to fetch Round 1 applicants for a specific role
app.get('/getRound1Applicants', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Missing role information' });
        }

        // Assuming Applicant is your Mongoose model for applicants
        const Applicant = mongoose.model('Applicant', new Schema({
            name: String,
            email: String,
            marks: Number,
            grade: String,
            role: String,
            currentRound: Number
        }));

        const applicants = await Applicant.find({ role, currentRound: 1 }); // Fetch applicants for Round 1
        res.status(200).json(applicants);
    } catch (error) {
        handleMongoError(res, error);
    }
});
// Example route to fetch rounds for a role
app.get('/getRounds', async (req, res) => {
    const { role } = req.query;
    try {
        // Fetch rounds data based on role from your database or a static source
        const rounds = await RoundModel.find({ role }).exec(); // Example with Mongoose model

        res.status(200).json({ rounds });
    } catch (error) {
        console.error('Error fetching rounds:', error);
        res.status(500).send('Error fetching rounds');
    }
});
app.post('/marks/submitRoundMarks', connectToMongoDB, async (req, res) => {
    const { role, data, round } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0 || !round) {
        return res.status(400).json({ message: 'Invalid data or round information received' });
    }

    try {
        const collection = req.db.collection('applicants');
        const gradingDetails = await req.db.collection('gradingSystems').findOne({ role });
        if (!gradingDetails || !gradingDetails.gradingSystem) {
            return res.status(404).json({ message: 'Grading system not found' });
        }

        const gradingLevels = gradingDetails.gradingSystem;
        const updatePromises = data.map(applicant => {
            const cumulativeMarks = applicant.marks.reduce((acc, mark) => acc + mark, 0);
            const grade = calculateGrade(cumulativeMarks, gradingLevels);

            return collection.updateOne(
                { _id: new ObjectId(applicant._id) },
                {
                    $set: {
                        [`rounds.round${round}.marks`]: applicant.marks,
                        [`rounds.round${round}.cumulativeMarks`]: cumulativeMarks,
                        [`rounds.round${round}.grade`]: grade,
                        [`rounds.round${round}.status`]: grade !== 'F' ? 'Passed' : 'Failed',
                        'currentRound': round
                    }
                }
            );
        });

        const results = await Promise.all(updatePromises);
        res.status(200).json({ message: 'Marks submitted successfully' });
    } catch (error) {
        console.error('Error submitting marks:', error);
        res.status(500).json({ message: 'Error submitting marks' });
    }
});


const fetchApplicantsForRound = (round) => {
    return async (req, res) => {
        const { role } = req.query;
        try {
            const collection = req.db.collection('applicants');
            const applicants = await collection.find({
                role,
                currentRound: round - 1,
                [`rounds.round${round - 1}.status`]: 'Passed'
            }).toArray();

            res.status(200).json(applicants);
        } catch (error) {
            console.error(`Error fetching applicants for Round ${round}:`, error);
            res.status(500).json({ message: `Error fetching applicants for Round ${round}` });
        }
    };
};


const fetchFailedApplicants = (round) => {
    return async (req, res) => {
        try {
            const collection = req.db.collection('applicants');
            const failedApplicants = await collection.find({
                [`rounds.round${round}.status`]: 'Failed'
            }).toArray();

            res.status(200).json(failedApplicants);
        } catch (error) {
            console.error(`Error fetching failed applicants for Round ${round}:`, error);
            res.status(500).json({ message: `Error fetching failed applicants for Round ${round}` });
        }
    };
};
// Define the /finalResults endpoint
app.get('/finalResults', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        console.log(`Fetching final results for role: ${role}`);

        const applicantsCollection = req.db.collection('applicants');
        const rolesCollection = req.db.collection('roles');

        // Fetch applicants for final results
        const passedApplicants = await applicantsCollection.find({
            role,
            currentRound: 3,
            'rounds.round3.status': 'Passed'
        }).toArray();

        // Fetch all available roles
        const roles = await rolesCollection.find().toArray();

        console.log('Final applicants:', passedApplicants);
        console.log('Available roles:', roles);

        if (passedApplicants.length > 0) {
            res.json({ passedApplicants, roles });
        } else {
            res.status(404).send('No applicants found for final results');
        }
    } catch (error) {
        console.error('Error fetching final results:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Example route to handle role userment (adjust as per your application flow)
app.post('/userRole', connectToMongoDB, async (req, res) => {
    try {
        const { applicantId, selectedRole } = req.body;

        if (!applicantId || !selectedRole) {
            return res.status(400).json({ message: 'Applicant ID or selected role missing' });
        }

        // Update applicant's role in the database
        const updatedApplicant = await Applicant.findByIdAndUpdate(
            applicantId,
            { role: selectedRole },
            { new: true } // To return the updated document
        );

        if (!updatedApplicant) {
            return res.status(404).json({ message: 'Applicant not found' });
        }

        res.json({ message: 'Role usered successfully', updatedApplicant });
    } catch (error) {
        console.error('Error usering role:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// Route to serve roles customization page first
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'roles.html'));
});

// Endpoint to save roles
app.post('/saveRoles', connectToMongoDB, async (req, res) => {
    const { roles } = req.body;

    try {
        if (!roles || !Array.isArray(roles)) {
            return res.status(400).json({ message: 'Invalid roles data' });
        }

        const collection = req.db.collection('roles');
        await collection.insertMany(roles);

        res.status(200).json({ message: 'Roles saved successfully' });
    } catch (error) {
        console.error('Error saving roles:', error);
        res.status(500).json({ message: 'Error saving roles' });
    }
});

// Route to serve round customization page
app.get('/roundcustomization', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'roundcustomization.html'));
});

// Endpoint to save rounds
app.post('/saveRounds', connectToMongoDB, async (req, res) => {
    const { role, rounds } = req.body;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Role information missing' });
        }

        const collection = req.db.collection('rounds');
        const existing = await collection.findOne({ role });

        if (existing) {
            await collection.updateOne(
                { role },
                { $set: { rounds } }
            );
        } else {
            await collection.insertOne({ role, rounds });
        }

        res.status(200).json({ message: 'Rounds saved successfully' });
    } catch (error) {
        console.error('Error saving rounds:', error);
        res.status(500).json({ message: 'Error saving rounds' });
    }
});

// Endpoint to save grading system
app.post('/saveGrading', connectToMongoDB, async (req, res) => {
    const { role, gradingSystem } = req.body;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Role information missing' });
        }

        const collection = req.db.collection('gradingSystems');
        const existing = await collection.findOne({ role });

        if (existing) {
            await collection.updateOne(
                { role },
                { $set: { gradingSystem } }
            );
        } else {
            await collection.insertOne({ role, gradingSystem });
        }

        res.status(200).json({ message: 'Grading system saved successfully' });
    } catch (error) {
        console.error('Error saving grading system:', error);
        res.status(500).json({ message: 'Error saving grading system' });
    }
});

// Endpoint to fetch roles
app.get('/getRoles', connectToMongoDB, async (req, res) => {
    try {
        const collection = req.db.collection('roles');
        const roles = await collection.find({}).toArray();
        res.status(200).json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Error fetching roles' });
    }
});

// Endpoint to get roles with rounds and grading system
app.get('/getRolesWithDetails', connectToMongoDB, async (req, res) => {
    try {
        const rolesCollection = req.db.collection('roles');
        const roundsCollection = req.db.collection('rounds');
        const gradingCollection = req.db.collection('gradingSystems');

        const roles = await rolesCollection.find({}).toArray();

        const rolesWithDetails = await Promise.all(
            roles.map(async (role) => {
                const rounds = await roundsCollection.findOne({ role: role.role }) || {};
                const grading = await gradingCollection.findOne({ role: role.role }) || {};
                return {
                    ...role,
                    rounds: rounds.rounds || [],
                    gradingSystem: grading.gradingSystem || []
                };
            })
        );

        res.status(200).json(rolesWithDetails);
    } catch (error) {
        console.error('Error fetching roles with details:', error);
        res.status(500).json({ message: 'Error fetching roles with details' });
    }
});

// Endpoint to add applicants
app.post('/addApplicant', connectToMongoDB, async (req, res) => {
    const { name, email, role, currentRound = 1 } = req.body;

    try {
        if (!name || !email || !role) {
            return res.status(400).json({ message: 'Missing applicant data' });
        }

        const collection = req.db.collection('applicants');
        await collection.insertOne({ name, email, role, currentRound });

        res.status(200).json({ message: 'Applicant added successfully' });
    } catch (error) {
        console.error('Error adding applicant:', error);
        res.status(500).json({ message: 'Error adding applicant' });
    }
});

// Endpoint to get all applicants
app.get('/getApplicants', connectToMongoDB, async (req, res) => {
    try {
        const collection = req.db.collection('applicants');
        const applicants = await collection.find({}).toArray();
        res.status(200).json(applicants);
    } catch (error) {
        console.error('Error fetching applicants:', error);
        res.status(500).json({ message: 'Error fetching applicants' });
    }
});
app.get('/getRoundDetails', connectToMongoDB, async (req, res) => {
    const { role } = req.query;
    
    try {
        if (!role) {
            return res.status(400).json({ message: 'Role not specified' });
        }
        
        const rolesCollection = req.db.collection('roles');
        const roleDetails = await rolesCollection.findOne({ role });

        if (!roleDetails || !roleDetails.rounds || roleDetails.rounds.length === 0) {
            return res.status(404).json({ message: 'Round details not found for the role' });
        }
        
        const firstRound = roleDetails.rounds[0]; // Get the first round
        res.status(200).json({ round: firstRound });
    } catch (error) {
        console.error('Error fetching round details:', error);
        res.status(500).json({ message: 'Error fetching round details' });
    }
});


app.get('/getGradingLevels', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Missing role information' });
        }

        const gradingSystemsCollection = req.db.collection('gradingSystems');
        const gradingDetails = await gradingSystemsCollection.findOne({ role });

        if (!gradingDetails || !gradingDetails.gradingSystem) {
            return res.status(404).json({ message: 'Grading system not found for the role' });
        }

        res.status(200).json({ gradingSystem: gradingDetails.gradingSystem });
    } catch (error) {
        console.error('Error fetching grading levels:', error);
        res.status(500).json({ message: 'Error fetching grading levels', error: error.message });
    }
});

app.get('/getGradingLevels', async (req, res) => {
    const role = req.query.role;
    try {
        const gradingData = await db.collection('gradingSystems').findOne({ role });
        if (!gradingData) {
            return res.status(404).json({ error: 'Grading system not found for this role' });
        }
        res.json({ gradingSystem: gradingData.gradingSystem });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch grading levels' });
    }
});


// Endpoint to get all applicants for a specific role
app.get('/getApplicantsForRole', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Missing role information' });
        }

        const collection = req.db.collection('applicants');
        const applicants = await collection.find({ role }).toArray();
        
        res.status(200).json(applicants);
    } catch (error) {
        console.error('Error fetching applicants for role:', error);
        res.status(500).json({ message: 'Error fetching applicants for role' });
    }
});


// Endpoint to get round details for a specific role
app.get('/getRoundDetails', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Missing role information' });
        }

        const roundsCollection = req.db.collection('rounds');
        const roundDetails = await roundsCollection.findOne({ role });

        if (!roundDetails) {
            return res.status(404).json({ message: 'Round details not found for the role' });
        }

        // Extract relevant information: section name and passMarks
        const roundsData = roundDetails.rounds.map(round => ({
            description: round.description,
            sections: round.sections.map(section => ({
                section: section.section,
                passMarks: section.passMarks
            }))
        }));

        res.json({ rounds: roundsData });
    } catch (error) {
        console.error('Error fetching round details:', error);
        res.status(500).json({ message: 'Error fetching round details', error });
    }
});

app.get('/getRoundName', async (req, res) => {
    const { role, roundNumber } = req.query;

    try {
        const roleData = await db.collection('roles').findOne({ role });
        if (!roleData) {
            return res.status(404).send('Role not found');
        }

        const round = roleData.rounds.find(r => r.round === parseInt(roundNumber));
        if (!round) {
            return res.status(404).send('Round not found');
        }

        res.json({
            roundName: round.description,
            sections: round.sections ? round.sections.map(section => section.section) : []
        });
    } catch (error) {
        console.error('Error fetching round name:', error);
        res.status(500).send('Error fetching round name');
    }
});


// Endpoint to submit Round 2 marks





// Endpoint to get grading system for a specific role
app.get('/getGradingSystem', connectToMongoDB, async (req, res) => {
    const { role } = req.query;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Missing role information' });
        }

        const gradingCollection = req.db.collection('gradingSystems');
        const gradingSystem = await gradingCollection.findOne({ role });

        if (!gradingSystem) {
            return res.status(404).json({ message: 'Grading system not found for the role' });
        }

        res.status(200).json(gradingSystem);
    } catch (error) {
        console.error('Error fetching grading system:', error);
        res.status(500).json({ message: 'Error fetching grading system' });
    }
});

// Endpoint to get Round 1 applicants for a specific role
app.get('/getRound1Applicants', async (req, res) => {
    const { role } = req.query;

    try {
        if (!role) {
            return res.status(400).json({ message: 'Missing role information' });
        }

        const applicants = await Applicant.find({ role, currentRound: 1 }); // Fetch applicants for Round 1
        res.status(200).json(applicants);
    } catch (error) {
        handleMongoError(res, error);
    }
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'confirm-role.html'));
});



// Endpoint to redirect to selection process page
app.get('/selectionProcess', (req, res) => {
    const { role } = req.query;

    // Perform any necessary validation or processing here

    res.redirect(`/selectionProcess.html?role=${role}`); // Redirect to selection process page with role query parameter
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bodyParser = require('body-parser');
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { model, Schema } = require('mongoose');




const app = express();
const port = process.env.PORT || 3000;

const url = 'mongodb://localhost:27017/';
const dbName = 'Internproject';

app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes
app.use(express.static(path.join(__dirname, 'public')));

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
mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Example: 30 seconds timeout
    socketTimeoutMS: 45000, // Example: 45 seconds timeout
});





// Nodemailer Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
    },
});

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

// Existing start server code
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

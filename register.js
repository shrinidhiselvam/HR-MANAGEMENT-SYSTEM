const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to handle JSON and URL encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/Internproject', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Define Schema for Registration Data
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

// Create Registration Model based on Schema
const Registration = mongoose.model('Registration', registrationSchema);

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

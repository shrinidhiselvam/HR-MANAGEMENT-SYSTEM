const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Initialize express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Internproject', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

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

const Salary = mongoose.model('Salary', SalarySchema);
const SalaryChange = mongoose.model('SalaryChange', SalaryChangeSchema);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes

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

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'salary.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

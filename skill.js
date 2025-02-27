const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const port = 3000;

const url = 'mongodb://127.0.0.1:27017';
const dbName = 'Internproject';

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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

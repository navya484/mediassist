require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());

const { MONGODB_URI, JWT_SECRET, FASTAPI_URL, FASTAPI_API_KEY } = process.env;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const prescriptionSchema = new mongoose.Schema({
  id: String,
  name: String,
  diagnosis: String,
  meds: String,
  transcription: String,
  createdAt: { type: Date, default: Date.now }
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

app.post('/api/transcribe', async (req, res) => {
  try {
    const { transcription } = req.body;
    if (!transcription) throw new Error('No transcription provided');

    const response = await fetch(`${FASTAPI_URL}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': FASTAPI_API_KEY,
      },
      body: JSON.stringify({ transcription }),
    });

    if (!response.ok) throw new Error('FastAPI error');

    const structuredData = await response.json();

    // Validate data
    if (!structuredData.name || !structuredData.diagnosis || !structuredData.meds) {
      throw new Error('Invalid structured data');
    }

    const uuid = crypto.randomUUID();
    const doc = new Prescription({
      id: uuid,
      ...structuredData,
      transcription: structuredData.transcription,
    });
    await doc.save();

    const token = jwt.sign({ id: uuid }, JWT_SECRET, { expiresIn: '7d' });
    const shareUrl = `http://localhost:5000/share/${token}`;

    res.json({ url: shareUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/share/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, JWT_SECRET);
    const { id } = decoded;

    const prescription = await Prescription.findOne({ id });
    if (!prescription) throw new Error('Prescription not found');

    res.send(`
      <html>
        <body>
          <h1>Digital Prescription</h1>
          <p><strong>Patient Name:</strong> ${prescription.name}</p>
          <p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>
          <p><strong>Medications:</strong> ${prescription.meds}</p>
          <p><strong>Full Transcription:</strong> ${prescription.transcription}</p>
          <p><strong>Created:</strong> ${prescription.createdAt}</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(401).send('<h1>Unauthorized or Expired Link</h1>');
  }
});

app.listen(5000, () => console.log('Express server running on port 5000'));
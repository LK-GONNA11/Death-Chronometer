const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB via environment variable
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('Error: MONGO_URI environment variable not set');
  process.exit(1);
}

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Timer model
const timerSchema = new mongoose.Schema({
    pseudo: { type: String, required: true },
    description: String,
    seconds: { type: Number, default: 0 },
    isRunning: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
});

const Timer = mongoose.model('Timer', timerSchema);

// API routes
app.post('/api/timers', async (req, res) => {
    try {
        const { pseudo, description } = req.body;

        const existingTimer = await Timer.findOne({ pseudo });
        if (existingTimer) {
            return res.status(400).json({ error: 'Timer with this username already exists' });
        }

        const timer = new Timer({
            pseudo,
            description,
            isRunning: true
        });

        await timer.save();
        res.status(201).json(timer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/timers', async (req, res) => {
    try {
        const timers = await Timer.find().sort({ seconds: -1 });
        res.json(timers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/timers/recent', async (req, res) => {
    try {
        const timers = await Timer.find().sort({ lastUpdated: -1 }).limit(5);
        res.json(timers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/timers/:pseudo', async (req, res) => {
    try {
        const timer = await Timer.findOne({ pseudo: req.params.pseudo });
        if (!timer) {
            return res.status(404).json({ error: 'Timer not found' });
        }
        res.json(timer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/timers/:id', async (req, res) => {
    try {
        const { seconds, isRunning, description } = req.body;

        const timer = await Timer.findByIdAndUpdate(
            req.params.id,
            {
                seconds,
                isRunning,
                description,
                lastUpdated: Date.now()
            },
            { new: true }
        );

        if (!timer) {
            return res.status(404).json({ error: 'Timer not found' });
        }

        res.json(timer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/timers/:id', async (req, res) => {
    try {
        const timer = await Timer.findByIdAndDelete(req.params.id);
        if (!timer) {
            return res.status(404).json({ error: 'Timer not found' });
        }
        res.json({ message: 'Timer deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve static files (index.html, CSS, JS...) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for any other request (useful for client side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

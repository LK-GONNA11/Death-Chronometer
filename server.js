const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose.connect('mongodb://localhost:27017/deathChronometer', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const timerSchema = new mongoose.Schema({
    pseudo: { type: String, required: true },
    description: String,
    seconds: { type: Number, default: 0 },
    isRunning: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
});

const Timer = mongoose.model('Timer', timerSchema);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});ole.log(`Server running on port ${PO

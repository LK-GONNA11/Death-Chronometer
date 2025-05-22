const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3000;

const DB_PATH = path.join(__dirname, 'timers.json');

app.use(cors());
app.use(express.json());

function loadTimers() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '[]');
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveTimers(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

app.get('/api/timers', (req, res) => {
    const timers = loadTimers();
    timers.sort((a, b) => b.seconds - a.seconds);
    res.json(timers);
});

app.get('/api/timers/recent', (req, res) => {
    const timers = loadTimers();
    timers.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(timers.slice(0, 5));
});

app.get('/api/timers/:pseudo', (req, res) => {
    const timers = loadTimers();
    const found = timers.find(t => t.pseudo === req.params.pseudo);
    if (!found) return res.status(404).json({ error: 'Timer not found' });
    res.json(found);
});

app.post('/api/timers', (req, res) => {
    const { pseudo, description, seconds } = req.body;
    if (!pseudo || typeof seconds !== 'number') {
        return res.status(400).json({ error: 'Invalid data' });
    }

    const timers = loadTimers();
    if (timers.find(t => t.pseudo === pseudo)) {
        return res.status(400).json({ error: 'Pseudo already exists' });
    }

    const newTimer = {
        id: Date.now().toString(),
        pseudo,
        description: description || '',
        seconds,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    timers.push(newTimer);
    saveTimers(timers);
    res.status(201).json(newTimer);
});

app.put('/api/timers/:id', (req, res) => {
    const { seconds, description } = req.body;
    const timers = loadTimers();
    const index = timers.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Timer not found' });

    timers[index].seconds = seconds ?? timers[index].seconds;
    if (description !== undefined) timers[index].description = description;
    timers[index].updatedAt = new Date().toISOString();

    saveTimers(timers);
    res.json(timers[index]);
});

app.delete('/api/timers/:id', (req, res) => {
    const timers = loadTimers();
    const index = timers.findIndex(t => t.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Timer not found' });

    const deleted = timers.splice(index, 1)[0];
    saveTimers(timers);
    res.json(deleted);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

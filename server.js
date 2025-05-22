const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10kb' }));

// Données en mémoire
let timers = [];

// Validation middleware
const validateTimerInput = (req, res, next) => {
  const { pseudo, description } = req.body;
  if (!pseudo || typeof pseudo !== 'string' || pseudo.length > 50) {
    return res.status(400).json({ error: 'Pseudo invalide (max 50 caractères)' });
  }
  if (description && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description invalide' });
  }
  next();
};

// Mettre à jour les timers toutes les secondes
setInterval(() => {
  const now = new Date();
  timers.forEach(timer => {
    if (timer.isRunning) {
      timer.seconds += 1;
      timer.lastUpdated = now;
    }
  });
}, 1000);

// Routes
app.post('/api/timers', validateTimerInput, (req, res) => {
  const { pseudo, description } = req.body;
  if (timers.some(t => t.pseudo === pseudo)) {
    return res.status(400).json({ error: 'Un timer avec ce pseudo existe déjà' });
  }

  const newTimer = {
    id: Date.now().toString(),
    pseudo,
    description: description || '',
    seconds: 0,
    isRunning: true,
    createdAt: new Date(),
    lastUpdated: new Date()
  };

  timers.push(newTimer);
  res.status(201).json(newTimer);
});

app.get('/api/timers', (req, res) => {
  const { sortBy = 'seconds', limit = 10 } = req.query;
  let sorted = [...timers];
  sorted.sort((a, b) => (sortBy === 'createdAt' ? b.createdAt - a.createdAt : b.seconds - a.seconds));
  res.json(sorted.slice(0, limit));
});

app.get('/api/timers/:pseudo', (req, res) => {
  const timer = timers.find(t => t.pseudo === req.params.pseudo);
  if (!timer) return res.status(404).json({ error: 'Timer non trouvé' });
  res.json(timer);
});

app.put('/api/timers/:id', (req, res) => {
  const timer = timers.find(t => t.id === req.params.id);
  if (!timer) return res.status(404).json({ error: 'Timer non trouvé' });

  const { seconds, isRunning, description } = req.body;
  if (typeof seconds === 'number' && seconds >= 0) timer.seconds = seconds;
  if (typeof isRunning === 'boolean') timer.isRunning = isRunning;
  if (typeof description === 'string') timer.description = description;
  timer.lastUpdated = new Date();

  res.json(timer);
});

app.delete('/api/timers/:id', (req, res) => {
  const index = timers.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Timer non trouvé' });
  const deleted = timers.splice(index, 1)[0];
  res.json({ message: `Timer supprimé: ${deleted.pseudo}` });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timersCount: timers.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

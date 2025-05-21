const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json({ limit: '10kb' }));

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit on connection failure
  }
};
connectDB();

// Mongoose Schema
const timerSchema = new mongoose.Schema({
  pseudo: { type: String, required: true, unique: true, maxlength: 50 },
  description: { type: String, default: '' },
  seconds: { type: Number, default: 0 },
  isRunning: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

const Timer = mongoose.model('Timer', timerSchema);

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Update running timers (every second)
setInterval(async () => {
  try {
    await Timer.updateMany(
      { isRunning: true },
      { $inc: { seconds: 1 }, $set: { lastUpdated: new Date() } }
    );
  } catch (err) {
    console.error('Error updating timers:', err.message);
  }
}, 1000);

// Routes
app.post('/api/timers', validateTimerInput, async (req, res) => {
  const { pseudo, description } = req.body;
  try {
    const existingTimer = await Timer.findOne({ pseudo });
    if (existingTimer) {
      return res.status(400).json({ error: 'Un timer avec ce pseudo existe déjà' });
    }

    const newTimer = new Timer({
      pseudo,
      description: description || '',
      seconds: 0,
      isRunning: true,
      createdAt: new Date(),
      lastUpdated: new Date()
    });

    await newTimer.save();
    console.log(`Nouveau timer créé: ${pseudo}`);
    res.status(201).json(newTimer);
  } catch (err) {
    console.error('Error creating timer:', err.message);
    res.status(500).json({ error: 'Erreur lors de la création du timer' });
  }
});

app.get('/api/timers', async (req, res) => {
  const { sortBy = 'seconds', limit = 10 } = req.query;
  try {
    const sortOption = sortBy === 'createdAt' ? { createdAt: -1 } : { seconds: -1 };
    const timers = await Timer.find()
      .sort(sortOption)
      .limit(parseInt(limit));
    res.json(timers);
  } catch (err) {
    console.error('Error fetching timers:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des timers' });
  }
});

app.get('/api/timers/recent', async (req, res) => {
  try {
    const recent = await Timer.find()
      .sort({ lastUpdated: -1 })
      .limit(5);
    res.json(recent);
  } catch (err) {
    console.error('Error fetching recent timers:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des timers récents' });
  }
});

app.get('/api/timers/:pseudo', async (req, res) => {
  try {
    const timer = await Timer.findOne({ pseudo: req.params.pseudo });
    if (!timer) {
      console.warn(`Timer non trouvé: ${req.params.pseudo}`);
      return res.status(404).json({ error: 'Timer non trouvé' });
    }
    res.json(timer);
  } catch (err) {
    console.error('Error fetching timer:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du timer' });
  }
});

app.put('/api/timers/:id', async (req, res) => {
  try {
    const timer = await Timer.findById(req.params.id);
    if (!timer) {
      console.warn(`Timer non trouvé: ID ${req.params.id}`);
      return res.status(404).json({ error: 'Timer non trouvé' });
    }

    const { seconds, isRunning, description } = req.body;
    if (seconds !== undefined && !isNaN(seconds) && seconds >= 0) {
      timer.seconds = parseInt(seconds);
    }
    if (isRunning !== undefined && typeof isRunning === 'boolean') {
      timer.isRunning = isRunning;
    }
    if (description !== undefined && typeof description === 'string') {
      timer.description = description;
    }
    timer.lastUpdated = new Date();

    await timer.save();
    console.log(`Timer mis à jour: ID ${req.params.id}`);
    res.json(timer);
  } catch (err) {
    console.error('Error updating timer:', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du timer' });
  }
});

app.delete('/api/timers/:id', async (req, res) => {
  try {
    const timer = await Timer.findByIdAndDelete(req.params.id);
    if (!timer) {
      console.warn(`Timer non trouvé: ID ${req.params.id}`);
      return res.status(404).json({ error: 'Timer non trouvé' });
    }
    console.log(`Timer supprimé: ${timer.pseudo}`);
    res.json({ message: 'Timer supprimé avec succès' });
  } catch (err) {
    console.error('Error deleting timer:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression du timer' });
  }
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    const count = await Timer.countDocuments();
    res.json({ status: 'OK', timersCount: count });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: 'Database error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
  console.error(`Erreur non capturée: ${err.message}`);
  process.exit(1); // Exit to prevent running in an unstable state
});

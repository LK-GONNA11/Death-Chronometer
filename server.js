const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet'); // Sécurité
const rateLimit = require('express-rate-limit'); // Limite de requêtes
const winston = require('winston'); // Logging

// Configuration du logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

const app = express();

// Middleware
app.use(helmet()); // Sécurise les en-têtes HTTP
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json({ limit: '10kb' })); // Limite la taille du payload

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use('/api/', limiter);

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

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

let timers = [];
let nextId = 1;

// Intervalle pour mettre à jour les timers actifs
setInterval(() => {
  timers = timers.map(timer => {
    if (timer.isRunning) {
      timer.seconds += 1;
      timer.lastUpdated = new Date();
    }
    return timer;
  });
}, 1000);

// Routes
app.post('/api/timers', validateTimerInput, (req, res) => {
  const { pseudo, description } = req.body;
  
  if (timers.find(t => t.pseudo === pseudo)) {
    return res.status(400).json({ error: 'Un timer avec ce pseudo existe déjà' });
  }

  const newTimer = {
    id: nextId++,
    pseudo,
    description: description || '',
    seconds: 0,
    isRunning: true,
    createdAt: new Date(),
    lastUpdated: new Date()
  };
  
  timers.push(newTimer);
  logger.info(`Nouveau timer créé: ${pseudo}`);
  res.status(201).json(newTimer);
});

app.get('/api/timers', (req, res) => {
  const { sortBy = 'seconds', limit = 10 } = req.query;
  let sortedTimers = [...timers];
  
  if (sortBy === 'seconds') {
    sortedTimers.sort((a, b) => b.seconds - a.seconds);
  } else if (sortBy === 'createdAt') {
    sortedTimers.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  res.json(sortedTimers.slice(0, parseInt(limit)));
});

app.get('/api/timers/recent', (req, res) => {
  const recent = timers
    .sort((a, b) => b.lastUpdated - a.lastUpdated)
    .slice(0, 5);
  res.json(recent);
});

app.get('/api/timers/:pseudo', (req, res) => {
  const timer = timers.find(t => t.pseudo === req.params.pseudo);
  if (!timer) {
    logger.warn(`Timer non trouvé: ${req.params.pseudo}`);
    return res.status(404).json({ error: 'Timer non trouvé' });
  }
  res.json(timer);
});

app.put('/api/timers/:id', (req, res) => {
  const timer = timers.find(t => t.id === parseInt(req.params.id));
  if (!timer) {
    logger.warn(`Timer non trouvé: ID ${req.params.id}`);
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
  logger.info(`Timer mis à jour: ID ${req.params.id}`);
  res.json(timer);
});

app.delete('/api/timers/:id', (req, res) => {
  const index = timers.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    logger.warn(`Tentative de suppression d'un timer non existant: ID ${req.params.id}`);
    return res.status(404).json({ error: 'Timer non trouvé' });
  }

  const deletedTimer = timers.splice(index, 1)[0];
  logger.info(`Timer supprimé: ${deletedTimer.pseudo}`);
  res.json({ message: 'Timer supprimé avec succès' });
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timersCount: timers.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  logger.error(`Erreur non capturée: ${err.message}`);
});

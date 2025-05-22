require('dotenv').config(); // Charge les variables d'environnement

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connexion MongoDB
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Erreur: MONGODB_URI est vide ou invalide");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("MongoDB connecté");
  } catch (err) {
    console.error("Erreur de connexion MongoDB:", err.message);
    process.exit(1);
  }
};
connectDB();

// Schema
const timerSchema = new mongoose.Schema({
  pseudo: { type: String, required: true, unique: true, maxlength: 50 },
  description: { type: String, default: '' },
  seconds: { type: Number, default: 0 },
  isRunning: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

const Timer = mongoose.model('Timer', timerSchema);

// Routes
app.post('/api/timers', async (req, res) => {
  const { pseudo, description } = req.body;
  if (!pseudo || typeof pseudo !== 'string' || pseudo.length > 50) {
    return res.status(400).json({ error: 'Pseudo invalide (max 50 caractères)' });
  }

  try {
    const exists = await Timer.findOne({ pseudo });
    if (exists) {
      return res.status(400).json({ error: 'Timer déjà existant' });
    }

    const timer = new Timer({ pseudo, description });
    await timer.save();
    res.status(201).json(timer);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/timers', async (req, res) => {
  try {
    const timers = await Timer.find().sort({ seconds: -1 }).limit(10);
    res.json(timers);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/health', async (req, res) => {
  try {
    const count = await Timer.countDocuments();
    res.json({ status: 'OK', timersCount: count });
  } catch (err) {
    res.status(500).json({ status: 'ERROR' });
  }
});

// Incrémentation automatique chaque seconde
setInterval(async () => {
  try {
    await Timer.updateMany(
      { isRunning: true },
      { $inc: { seconds: 1 }, $set: { lastUpdated: new Date() } }
    );
  } catch (err) {
    console.error('Erreur interval:', err.message);
  }
}, 1000);

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur actif sur le port ${PORT}`);
});

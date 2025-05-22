const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10kb' }));

// MongoDB connection
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string') {
    console.error('Erreur: MONGODB_URI est vide ou invalide');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connexion MongoDB réussie');
  } catch (err) {
    console.error('Erreur de connexion MongoDB :', err.message);
    process.exit(1);
  }
};
connectDB();

// --- le reste de ton code reste inchangé ici ---

// Fin : démarrage du serveur
app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});

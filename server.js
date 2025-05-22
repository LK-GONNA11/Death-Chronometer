const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

let startTime = null;
let isRunning = false;

app.use(express.static(path.join(__dirname, 'public')));

// Routes backend
app.get('/start', (req, res) => {
  startTime = Date.now();
  isRunning = true;
  res.json({ message: 'Chronomètre démarré' });
});

app.get('/stop', (req, res) => {
  if (isRunning && startTime) {
    const elapsed = Date.now() - startTime;
    isRunning = false;
    startTime = null;
    res.json({ message: `Chronomètre arrêté : ${elapsed / 1000}s` });
  } else {
    res.json({ message: 'Chronomètre non démarré' });
  }
});

app.get('/status', (req, res) => {
  if (isRunning && startTime) {
    const elapsed = Date.now() - startTime;
    res.json({ running: true, elapsed: elapsed / 1000 });
  } else {
    res.json({ running: false });
  }
});

// Rediriger toutes les autres routes vers index.html (pour React ou simple HTML)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});

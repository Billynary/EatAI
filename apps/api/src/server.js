'use strict';

const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');

const config = require('./config');
const foodRoutes = require('./routes/food');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api', foodRoutes);

// Express recognises an error handler by its arity, so `next` has to stay.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[api] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`[api] listening on port ${config.port}`);
});

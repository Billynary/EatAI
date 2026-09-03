'use strict';

const { Pool } = require('pg');

const config = require('./config');

const pool = new Pool(config.database);

pool.on('error', (err) => {
  console.error('[db] unexpected error on idle client', err);
  process.exit(1);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};

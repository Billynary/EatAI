'use strict';

require('dotenv').config();

/** Every environment variable the API reads, resolved in exactly one place. */
const config = {
  port: Number(process.env.BACKEND_PORT || 3002),
  database: {
    host: process.env.POSTGRES_HOST || 'database',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'eatai',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'eatai',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    assistantId: process.env.OPENAI_ASSISTANT_ID || '',
  },
  // Single-user application: every row belongs to the seeded default user.
  defaultUserId: Number(process.env.DEFAULT_USER_ID || 1),
};

module.exports = config;

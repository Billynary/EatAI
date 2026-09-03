'use strict';

const express = require('express');
const { OpenAI } = require('openai');

const config = require('../config');
const db = require('../db');

const router = express.Router();
const openai = new OpenAI({ apiKey: config.openai.apiKey });

const USER_ID = config.defaultUserId;

/** An empty date field arrives as '' from the form and has to become NULL. */
function nullableDate(value) {
  return value === '' || value === undefined ? null : value;
}

function fail(res, err, message) {
  console.error(`[api] ${message}`, err);
  res.status(500).json({ error: message });
}

// --- Inventory ------------------------------------------------------------

router.get('/food', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM food_inventory WHERE user_id = $1 ORDER BY expiry_date NULLS LAST',
      [USER_ID],
    );
    res.json(result.rows);
  } catch (err) {
    fail(res, err, 'Failed to fetch food items');
  }
});

router.post('/food', async (req, res) => {
  const { name, quantity, expiry_date: expiryDate, category } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO food_inventory (name, quantity, expiry_date, category, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, quantity, nullableDate(expiryDate), category, USER_ID],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    fail(res, err, 'Failed to add food item');
  }
});

router.put('/food/:id', async (req, res) => {
  const { id } = req.params;
  const { name, quantity, expiry_date: expiryDate, category } = req.body;

  try {
    const result = await db.query(
      `UPDATE food_inventory
          SET name = $1, quantity = $2, expiry_date = $3, category = $4, updated_at = NOW()
        WHERE id = $5 AND user_id = $6
        RETURNING *`,
      [name, quantity, nullableDate(expiryDate), category, id, USER_ID],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    fail(res, err, 'Failed to update food item');
  }
});

router.delete('/food/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM food_inventory WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, USER_ID],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json({ message: 'Food item deleted' });
  } catch (err) {
    fail(res, err, 'Failed to delete food item');
  }
});

// --- Recipes --------------------------------------------------------------

function recipePrompt(ingredients, options) {
  const { style, allergies, servings, cookTime, difficulty } = options;

  return `You are a helpful culinary assistant.

Given:
- Ingredients: ${ingredients.join(', ')}
- Style: ${style || 'any'}
- Allergies: ${allergies || 'none'}
- Preferred servings: ${servings || 'any'}
- Preferred cook time: ${cookTime || 'any'}
- Preferred difficulty: ${difficulty || 'any'}

Generate 2-3 recipes. Return a valid JSON array using this format:
[
  {
    "name": "string",
    "description": "string",
    "ingredients": ["ingredient 1", "ingredient 2"],
    "instructions": ["step 1", "step 2"],
    "cookTime": "e.g. 25 minutes",
    "servings": number,
    "difficulty": "Easy" | "Medium" | "Hard"
  }
]

Only return raw JSON. No markdown, no explanation.`;
}

/** Poll the assistant run until it leaves the queued/in-progress states. */
async function waitForRun(threadId, runId) {
  const terminal = ['completed', 'failed', 'cancelled', 'expired', 'requires_action'];

  for (;;) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    if (terminal.includes(run.status)) {
      return run;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

router.post('/generate-recipes', async (req, res) => {
  const options = req.body || {};

  try {
    const inventory = await db.query('SELECT name FROM food_inventory WHERE user_id = $1', [
      USER_ID,
    ]);
    const ingredients = inventory.rows.map((row) => row.name);

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: recipePrompt(ingredients, options),
    });

    const started = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: config.openai.assistantId,
    });
    const run = await waitForRun(thread.id, started.id);
    if (run.status !== 'completed') {
      return res.status(502).json({ error: `Recipe generation ${run.status}` });
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const recipes = JSON.parse(messages.data[0].content[0].text.value);

    for (const recipe of recipes) {
      const image = await openai.images.generate({
        prompt: `Top-down view of a finished dish called "${recipe.name}". ${
          options.style || ''
        } style. High quality food photography.`,
        n: 1,
        size: '512x512',
      });
      recipe.image = image.data[0].url;
    }

    res.json(recipes);
  } catch (err) {
    fail(res, err, 'Recipe generation failed');
  }
});

module.exports = router;

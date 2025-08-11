import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const app = express();
app.use(cors());
app.use(express.json());

// --- DB ---
await mongoose.connect(process.env.MONGODB_URI);

// --- Model ---
const habitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cadence: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  target: { type: Number, default: 1 },         // times per period
  startDate: { type: Date, default: Date.now },
  notes: String,
}, { timestamps: true });

const Habit = mongoose.model('Habit', habitSchema);

// --- Validation ---
const HabitCreate = z.object({
  name: z.string().min(1, 'name is required'),
  cadence: z.enum(['daily', 'weekly']).optional(),
  target: z.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
  notes: z.string().optional()
});

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/habits', async (req, res) => {
  const items = await Habit.find().sort({ createdAt: -1 }).lean();
  res.json(items);
});

app.post('/api/habits', async (req, res) => {
  const parsed = HabitCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const habit = await Habit.create(parsed.data);
  res.status(201).json(habit);
});

// --- Swagger ---
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.1.0',
    info: { title: 'AI Habit Tracker Backend', version: '0.1.0' }
  },
  apis: [] // we’ll keep inline for brevity
});

// Minimal inline docs
swaggerSpec.paths = {
  '/api/health': {
    get: { summary: 'Health', responses: { 200: { description: 'OK' } } }
  },
  '/api/habits': {
    get: { summary: 'List habits', responses: { 200: { description: 'Array of habits' } } },
    post: {
      summary: 'Create habit',
      requestBody: {
        required: true,
        content: { 'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              cadence: { type: 'string', enum: ['daily','weekly'] },
              target: { type: 'integer' },
              startDate: { type: 'string', format: 'date-time' },
              notes: { type: 'string' }
            },
            required: ['name']
          }
        }}},
      responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } }
    }
  }
};

app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Start ---
const port = process.env.PORT ?? 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

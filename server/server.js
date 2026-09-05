import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import geoRoutes from './routes/geo.js';
import placesRoutes from './routes/places.js';
import restroomsRoutes from './routes/restrooms.js';
import businessRoutes from './routes/businesses.js';
import ceiRoutes from './routes/cei.js';

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/geo', geoRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/restrooms', restroomsRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/cei', ceiRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

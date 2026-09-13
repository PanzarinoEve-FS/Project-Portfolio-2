import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/db.js';
import geoRoutes from './routes/geo.js';
import placesRoutes from './routes/places.js';
import restroomsRoutes from './routes/restrooms.js';
import businessRoutes from './routes/businesses.js';
import ceiRoutes from './routes/cei.js';
import osmRoutes from './routes/osm.js';
import redditRoutes from './routes/reddit.js';
import surgeonRoutes from './routes/surgeons.js';
import authRoutes from './routes/auth.js';
import favoriteRoutes from './routes/favorites.js';
import { optionalAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5050;

// Behind a reverse proxy req.ip is the proxy's address, not the visitor's, so
// the login throttle would see every visitor as one client. Set TRUST_PROXY to
// the hop count (or a subnet) your host puts in front of this. Left off by
// default: trusting a forwarded header that nothing sets is worse.
if (process.env.TRUST_PROXY) {
  const value = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(value) ? Number(value) : value);
}

// credentials:true lets the signed-in cookie ride along on API calls.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Reads the session cookie on every request, so any route can tell who is
// signed in without each one repeating the work.
app.use(optionalAuth);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/geo', geoRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/restrooms', restroomsRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/cei', ceiRoutes);
app.use('/api/osm', osmRoutes);
app.use('/api/reddit', redditRoutes);
app.use('/api/surgeons', surgeonRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoriteRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safety-app');

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

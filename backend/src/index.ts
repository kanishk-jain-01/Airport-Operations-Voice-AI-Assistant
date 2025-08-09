import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './database/db';
import { WSServer } from './websocket/wsServer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = 8080;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/tables', async (_req, res) => {
  try {
    const tables = await db.getTableSchema();
    res.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'SQL query required' });
    }

    const result = await db.query(sql);
    return res.json({ result });
  } catch (error) {
    console.error('Query error:', error);
    return res.status(500).json({ error: 'Query failed', details: error });
  }
});

async function startServer() {
  try {
    await db.initialize();
    console.log('Database initialized');

    const wsServer = new WSServer(WS_PORT, process.env.OPENAI_API_KEY || '');
    console.log(`WebSocket server started on port ${WS_PORT}`);

    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
      console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
    });

    process.on('SIGINT', () => {
      console.log('Shutting down...');
      db.close();
      wsServer.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
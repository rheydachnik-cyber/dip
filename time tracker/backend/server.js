const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config();
const app = express();
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-frontend-domain.com',
    'http://o903342w.beget.tech'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const initDataFile = (filePath, defaultData) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
};
initDataFile(path.join(dataDir, 'users.json'), []);
initDataFile(path.join(dataDir, 'projects.json'), []);
initDataFile(path.join(dataDir, 'timeEntries.json'), []);
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const timeEntryRoutes = require('./routes/timeEntries');
const userRoutes = require('./routes/users');
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/users', userRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data stored in: ${dataDir}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

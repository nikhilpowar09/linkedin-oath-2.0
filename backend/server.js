//server.js


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

// Database connection
const connectDB = require('./config/db');
connectDB();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Routes
app.use('/auth', require('./routes/auth'));  // For authentication routes
app.use('/api/posts', require('./routes/posts')); // For posts routes
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/interactions', require('./routes/interactions'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

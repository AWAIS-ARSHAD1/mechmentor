import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import setupEvaluateSpeech from './routes/evaluate-speech.js';
import setupScanNotes from './routes/scan-notes.js';
import setupSpacedRepetition from './routes/spaced-repetition.js';
import setupFbdEvaluate from './routes/fbd-evaluate.js';
import setupQuestions from './routes/questions.js';
import setupModifyQuestion from './routes/modify-question.js';
import setupGenerateProblem from './routes/generate-problem.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load dotenv config from parent directory's .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Global crash handlers to catch silent failures
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
  // Keep process alive for debugging, or exit gracefully
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS to explicitly allow the frontend domain
const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null;
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
if (frontendUrl) {
  allowedOrigins.push(frontendUrl);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. curl)
    if (!origin) return callback(null, true);
    
    // Normalize origin by removing any trailing slash
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    if (normalizedOrigin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  }
}));

// Body parsers configured with 100MB limits
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Static serving of uploads/
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configured for uploads/ directory, max 100MB limit
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type)) || 
                    /\.(pdf|png|jpg|jpeg|txt|doc|docx)$/i.test(file.originalname);
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format! Please upload a PDF, image, or text note document.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: fileFilter
});

// Middleware helper to safely wrap multer upload errors
const uploadSingle = (fieldname) => (req, res, next) => {
  upload.single(fieldname)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds limit. Maximum allowed size is 100MB.' });
        }
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    next();
  });
};

// Initialize GoogleGenerativeAI client with GEMINI_API_KEY
if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set in the environment variables.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const geminiModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || 'dummy_key');

const router = express.Router();

// Register all route files
setupEvaluateSpeech(router, geminiModel);
setupScanNotes(router, geminiModel, uploadSingle('notes'), fileManager);
setupSpacedRepetition(router);
setupFbdEvaluate(router, geminiModel);
setupQuestions(router);
setupModifyQuestion(router, geminiModel);
setupGenerateProblem(router, geminiModel);

app.use('/api', router);

// Graceful error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  if (err.status === 429 || err.name === 'RateLimitError') {
    return res.status(429).json({ status: 429, message: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong on the server!' });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Increase timeout for large file processing (e.g. 5 minutes)
server.setTimeout(300000);
server.requestTimeout = 300000;

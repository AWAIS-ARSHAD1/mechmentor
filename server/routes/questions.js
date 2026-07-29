import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_FILE = path.join(__dirname, '../data/questions.json');
const ELEVATOR_PITCHES_FILE = path.join(__dirname, '../data/elevator-pitches.json');

const readData = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
        return [];
    }
};

export default function setupQuestions(router) {
    router.get('/questions', (req, res) => {
        try {
            const { subject, category, difficulty } = req.query;
            let questions = readData(QUESTIONS_FILE);
            
            if (subject) {
                questions = questions.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
            }
            if (category) {
                questions = questions.filter(q => q.category.toLowerCase() === category.toLowerCase());
            }
            if (difficulty) {
                questions = questions.filter(q => q.difficulty == difficulty);
            }
            
            res.json(questions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/questions/random', (req, res) => {
        try {
            const { subject } = req.query;
            let questions = readData(QUESTIONS_FILE);
            
            if (subject) {
                questions = questions.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
            }
            
            if (questions.length === 0) {
                return res.status(404).json({ error: 'No questions found' });
            }
            
            const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
            res.json(randomQuestion);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/questions/:id', (req, res) => {
        try {
            const { id } = req.params;
            const questions = readData(QUESTIONS_FILE);
            const question = questions.find(q => q.id === id);
            
            if (!question) {
                return res.status(404).json({ error: 'Question not found' });
            }
            
            res.json(question);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/elevator-pitches/random', (req, res) => {
        try {
            const pitches = readData(ELEVATOR_PITCHES_FILE);
            
            if (pitches.length === 0) {
                return res.status(404).json({ error: 'No elevator pitches found' });
            }
            
            const randomPitch = pitches[Math.floor(Math.random() * pitches.length)];
            res.json(randomPitch);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

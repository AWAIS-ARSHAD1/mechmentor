import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, '../data/user-progress.json');

const readProgressFile = () => {
    try {
        if (!fs.existsSync(PROGRESS_FILE)) {
            return { userId: 'default', subjects: {}, history: [], dailyDrillsDue: 0, streakDays: 0, lastActive: null };
        }
        const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { userId: 'default', subjects: {}, history: [], dailyDrillsDue: 0, streakDays: 0, lastActive: null };
    }
};

const writeProgressFile = (data) => {
    const dir = path.dirname(PROGRESS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

export default function setupSpacedRepetition(router) {
    router.get('/spaced-repetition/due', (req, res) => {
        try {
            const progressFile = readProgressFile();
            const subjects = progressFile.subjects || {};
            const today = new Date().toISOString().split('T')[0];
            
            const dueSubjects = Object.keys(subjects).filter(subject => {
                const sr = subjects[subject]?.spacedRepetition;
                return sr && sr.nextReview && sr.nextReview <= today;
            });
            
            res.json(dueSubjects);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/spaced-repetition/update', (req, res) => {
        try {
            const { subject, quality } = req.body;
            
            if (!subject || quality === undefined) {
                return res.status(400).json({ error: 'Missing subject or quality' });
            }

            const progressFile = readProgressFile();
            if (!progressFile.subjects) progressFile.subjects = {};
            
            if (!progressFile.subjects[subject]) {
                progressFile.subjects[subject] = {
                    totalAttempts: 0,
                    correctAnswers: 0,
                    masteryScore: 0,
                    lastPracticed: null,
                    weakTopics: [],
                    spacedRepetition: {
                        interval: 1,
                        easeFactor: 2.5,
                        nextReview: null,
                        repetitions: 0
                    }
                };
            }
            
            let item = progressFile.subjects[subject];
            let sr = item.spacedRepetition;
            item.totalAttempts = (item.totalAttempts || 0) + 1;
            item.lastPracticed = new Date().toISOString();
            if (quality >= 3) item.correctAnswers = (item.correctAnswers || 0) + 1;
            
            // SM-2 Algorithm
            if (quality >= 3) {
                if (sr.repetitions === 0) {
                    sr.interval = 1;
                } else if (sr.repetitions === 1) {
                    sr.interval = 6;
                } else {
                    sr.interval = Math.round(sr.interval * sr.easeFactor);
                }
                sr.repetitions++;
            } else {
                sr.repetitions = 0;
                sr.interval = 1;
            }
            
            sr.easeFactor = sr.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            if (sr.easeFactor < 1.3) sr.easeFactor = 1.3;
            
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + sr.interval);
            sr.nextReview = nextDate.toISOString().split('T')[0];
            
            // Mastery score rolling average
            item.masteryScore = Math.min(100, Math.round(
                (item.masteryScore * (item.totalAttempts - 1) + (quality * 20)) / item.totalAttempts
            ));
            
            progressFile.lastActive = new Date().toISOString();
            writeProgressFile(progressFile);
            
            res.json({ success: true, updatedProgress: item });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/spaced-repetition/heatmap', (req, res) => {
        try {
            const progressFile = readProgressFile();
            const subjects = progressFile.subjects || {};
            
            // Build subjects map: name -> mastery score
            const subjectsMap = {};
            let weakest = null;
            let lowestScore = 101;
            const weakTopics = [];
            
            for (const [name, data] of Object.entries(subjects)) {
                const score = data.masteryScore || 0;
                subjectsMap[name] = score;
                if (score < lowestScore) {
                    lowestScore = score;
                    weakest = name;
                }
                if (score < 50 && data.weakTopics) {
                    weakTopics.push(...data.weakTopics);
                }
            }
            
            res.json({
                subjects: subjectsMap,
                weakTopics,
                weakest: weakest || 'None'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/spaced-repetition/reset', (req, res) => {
        try {
            writeProgressFile({ userId: 'default', subjects: {}, history: [], dailyDrillsDue: 0, streakDays: 0, lastActive: null });
            res.json({ success: true, message: 'Progress reset to defaults' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

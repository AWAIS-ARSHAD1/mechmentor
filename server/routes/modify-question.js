import { generateWithRetry, RateLimitError, QuotaExhaustedError } from '../utils/geminiRetry.js';

export default function setupModifyQuestion(router, geminiModel) {
  router.post('/modify-question', async (req, res, next) => {
    try {
      const { originalQuestion, command } = req.body;

      if (!originalQuestion || !command) {
        return res.status(400).json({ error: 'Missing originalQuestion or command' });
      }

      const prompt = `
You are an expert mechanical engineering instructor. A student has requested to modify an existing practice question to fit their syllabus constraints.

Original Question JSON:
${JSON.stringify(originalQuestion, null, 2)}

Modification Command:
"${command}"

Please rewrite the question to strictly follow the student's command. Return the modified question in the EXACT SAME JSON format. Do not change the original ID.

Required JSON format:
{
  "id": "...",
  "category": "...",
  "difficulty": 3,
  "question": "..."
}
`;

      const result = await generateWithRetry(geminiModel, prompt);
      let responseText = result.response.text();
      responseText = responseText.replace(/^```json\n?/m, '').replace(/\n?```$/m, '').trim();

      let modifiedQuestion;
      try {
        modifiedQuestion = JSON.parse(responseText);
        // Suffix the ID
        if (!modifiedQuestion.id.endsWith('-modified')) {
            modifiedQuestion.id = modifiedQuestion.id + '-modified';
        }
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", responseText);
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }

      res.json(modifiedQuestion);

    } catch (error) {
      if (error instanceof QuotaExhaustedError) {
        return res.status(429).json({ status: 429, message: error.message, reason: 'zero_quota' });
      }
      if (error instanceof RateLimitError) {
        return res.status(429).json({ status: 429, message: error.message });
      }
      next(error);
    }
  });
}

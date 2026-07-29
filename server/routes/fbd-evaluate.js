import { generateWithRetry, RateLimitError, QuotaExhaustedError } from '../utils/geminiRetry.js';

export default function setupFbdEvaluate(router, geminiModel) {
    router.post('/fbd-evaluate', async (req, res, next) => {
        try {
            const { canvasImage, textExplanation, question } = req.body;

            if (!canvasImage || !textExplanation) {
                return res.status(400).json({ error: 'Missing canvasImage or textExplanation' });
            }

            // Extract mimeType and base64 data
            let mimeType = 'image/png';
            let base64Data = canvasImage;
            const match = canvasImage.match(/^data:(image\/\w+);base64,(.*)$/);
            if (match) {
                mimeType = match[1];
                base64Data = match[2];
            } else {
                base64Data = canvasImage.replace(/^data:image\/\w+;base64,/, '');
            }

            const prompt = `
You are evaluating a mechanical engineering student's Free Body Diagram and written explanation.

Question/Problem: ${question || 'General evaluation'}
Student's Written Explanation: ${textExplanation}
The attached image is their hand-drawn Free Body Diagram.

Evaluate both the diagram and explanation together. Respond in JSON:
{
  "diagramScore": (0-100),
  "explanationScore": (0-100),
  "diagramFeedback": "What's good and what's missing in the diagram",
  "explanationFeedback": "Assessment of the written explanation",
  "missingElements": ["element1", "element2"],
  "idealApproach": "How an ideal response would look"
}
`;

            const result = await generateWithRetry(geminiModel, [
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                }
            ]);

            let responseText = result.response.text();
            responseText = responseText.replace(/^```json\n?/m, '').replace(/\n?```$/m, '').trim();
            
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse Gemini JSON:", responseText);
                return res.status(500).json({ error: 'Failed to parse AI response' });
            }

            res.json(parsedResponse);

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

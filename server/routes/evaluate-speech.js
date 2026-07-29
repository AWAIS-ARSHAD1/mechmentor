import { generateWithRetry, RateLimitError, QuotaExhaustedError } from '../utils/geminiRetry.js';

export default function setupEvaluateSpeech(router, geminiModel) {
  router.post('/evaluate-speech', async (req, res, next) => {
    try {
      const { transcript, question, subject, mode, duration, image } = req.body;

      if (!transcript || !question) {
        return res.status(400).json({ error: 'Missing transcript or question' });
      }

      // Local filler word detection
      const fillerWords = ["um", "uh", "like", "you know", "basically", "so yeah", "I mean", "sort of", "kind of", "actually", "literally"];
      const fillerCounts = {};
      let totalFillers = 0;
      
      const lowerTranscript = transcript.toLowerCase();
      fillerWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = lowerTranscript.match(regex);
        if (matches) {
          fillerCounts[word] = matches.length;
          totalFillers += matches.length;
        }
      });

      let inlineData = null;
      if (image) {
        const match = image.match(/^data:(image\/\w+);base64,(.*)$/);
        if (match) {
          inlineData = {
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          };
        }
      }

      // Call Gemini with structured prompt
      const prompt = `
You are an expert mechanical engineering interview coach. Evaluate this spoken answer.

Question: ${question}
Subject: ${subject || 'General'}
Candidate's Answer: ${transcript}
Duration: ${duration || 0} seconds
${image ? "The candidate has also attached a supplementary image (e.g. a sketch or diagram) to support their explanation. Evaluate how well this image explains the concept." : ""}

Respond in JSON format:
{
  "confidenceScore": (0-100 based on clarity, structure, and authority),
  "technicalScore": (0-100 based on accuracy and completeness),
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "idealResponse": "A polished, concise ideal engineer response to this question",
  "overallFeedback": "Brief encouraging summary"${image ? ',\n  "imageFeedback": "Specific feedback on the attached image and its relevance/clarity"' : ''}
}
`;

      const apiPayload = inlineData ? [prompt, inlineData] : prompt;
      const result = await generateWithRetry(geminiModel, apiPayload);
      let responseText = result.response.text();
      
      // Parse Gemini's JSON response (handle markdown code fences)
      responseText = responseText.replace(/^```json\n?/m, '').replace(/\n?```$/m, '').trim();
      let geminiData;
      try {
        geminiData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", responseText);
        return res.status(500).json({ error: 'Failed to parse AI evaluation' });
      }

      // Merge local filler word data with Gemini evaluation
      const finalResult = {
        ...geminiData,
        fillerAnalysis: {
          totalFillers,
          fillerCounts
        }
      };

      res.json(finalResult);

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

import { generateWithRetry, RateLimitError, QuotaExhaustedError } from '../utils/geminiRetry.js';

export default function setupGenerateProblem(router, geminiModel) {
    router.get('/generate-problem', async (req, res, next) => {
        try {
            const subject = req.query.subject || 'General Engineering';
            const difficulty = req.query.difficulty || 'Medium';

            let difficultyConstraint = '';
            switch (difficulty) {
                case 'Easy':
                    difficultyConstraint = "EASY BORDER: Maximum 2 sentences. Maximum 2 variables in 'Given Data'. Simple, single-step formula calculation. Data values must be small and simple integers.";
                    break;
                case 'Hard':
                    difficultyConstraint = 'HARD BORDER: Full paragraph. Includes implicit variables and unit conversions. Synthesis of multiple principles.';
                    break;
                case 'Super Hard':
                    difficultyConstraint = 'SUPER HARD BORDER: Extensive text. Open-ended complex engineering problem. High-level assumptions and boundary conditions.';
                    break;
                case 'Medium':
                default:
                    difficultyConstraint = 'MEDIUM BORDER: 3-4 sentences. 3-4 variables. Requires 2-3 calculation steps.';
                    break;
            }

            const prompt = `
You are a strict engineering professor. Generate a complex, calculation-based numerical problem for the subject: ${subject}. 
You MUST provide explicit 'Given Data' with numerical values.
NEVER ask purely theoretical or conceptual questions.
The problem should require mathematical calculation, formulas, and free body diagrams to solve.

DIFFICULTY LEVEL - ${difficulty}:
${difficultyConstraint}

You must generate clean, valid SVG code representing the physical scenario of the problem (e.g., a Free Body Diagram, pipe cross-section, or structural beam). The SVG MUST include text labels that match the exact numerical 'Given Data' from the problem statement. Ensure the SVG has a viewBox so it scales responsively.

STRICT SVG FORMATTING RULES:
1. Text MUST NEVER overlap with lines, shapes, or other text boxes. Space out all elements generously.
2. Use clear positioning for <text> elements. If text is placed over a line, include a <rect> with a solid fill color (e.g., white or background color) behind the text to mask the line, or place the text safely outside the physical geometry.
3. Ensure bounding boxes for dimensions are wide enough so text does not spill out.
4. ALWAYS add generous padding inside the viewBox so that text or shapes near the edges (especially at the top) are NEVER cut off. Do not place elements exactly at y=0 or x=0; leave at least a 20-50px margin around the entire diagram.

CRITICAL JSON RULE: You MUST use SINGLE QUOTES (') for all SVG and HTML attributes inside the svg_diagram string. NEVER use unescaped double quotes inside the SVG string, or it will break the JSON parser.

Respond strictly in the following JSON format:
{
  "id": "gen_<random_string>",
  "subject": "${subject}",
  "category": "calculation",
  "difficulty": (1-5 integer),
  "question": "The actual text of the problem including the given numerical values.",
  "svg_diagram": "<svg viewBox=\\"0 0 ...\\">...</svg>"
}
`;
            
            const result = await generateWithRetry(geminiModel, prompt);
            let responseText = result.response.text();
            
            responseText = responseText.replace(/^```json\n?/m, '').replace(/\n?```$/m, '').trim();
            
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse Gemini JSON for generate-problem:", responseText);
                return res.status(500).json({ error: 'Failed to parse AI response' });
            }

            // Fallback generation ID just in case AI messes up the format
            if (!parsedResponse.id || !parsedResponse.id.startsWith('gen_')) {
                parsedResponse.id = `gen_${Math.random().toString(36).substr(2, 9)}`;
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

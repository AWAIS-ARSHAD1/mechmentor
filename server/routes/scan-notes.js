import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import { GoogleGenAI, createPartFromUri } from '@google/genai';

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50MB

export default function setupScanNotes(router, _geminiModel, uploadMiddleware) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key' });

  router.post('/scan-notes', uploadMiddleware, async (req, res, next) => {
    let filePath = null;
    let uploadedFile = null;

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please select a valid document.' });
      }

      filePath = req.file.path;
      const fileExt = req.file.originalname.split('.').pop().toLowerCase();
      
      let mimeType = req.file.mimetype || '';
      if (!mimeType) {
        mimeType = fileExt === 'pdf' ? 'application/pdf' : 
                   fileExt === 'png' ? 'image/png' : 
                   fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 
                   fileExt === 'txt' ? 'text/plain' : 'application/octet-stream';
      }

      console.log(`Processing scan-notes file: ${req.file.originalname} (${req.file.size} bytes, ${mimeType})`);

      const promptText = `
You are generating a quiz using ONLY the text provided. Do not use any outside knowledge, textbook facts, or general mechanical engineering concepts that are not explicitly present in the provided text.

For EVERY question you generate, you must also output the exact sentence or phrase from the source text that the question is based on (as a "source_quote" field). If you cannot find a supporting quote in the text for a question, do not include that question.

Generate:
- 5 CONCEPT questions (testing understanding of definitions, principles, or explanations found in the text)
- 5 PROBLEM-SOLVER questions (testing application of formulas, numbers, or procedures found in the text)

Respond ONLY in valid JSON format matching this exact structure:
{
  "extractedTopics": ["Topic 1", "Topic 2"],
  "detectedSubjects": ["Subject 1"],
  "generatedQuestions": [
    {
      "id": "SCAN-001",
      "type": "concept",
      "question": "...",
      "keyPoints": ["...", "..."],
      "difficulty": 3,
      "idealResponse": "...",
      "source_quote": "..."
    }
  ]
}
`;

      // 1. Extract local text for validation (and chunking if >50MB)
      let extractedTextForValidation = '';
      if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: dataBuffer });
        try {
          const result = await parser.getText();
          extractedTextForValidation = result.text?.trim() ?? '';
          console.log(`\n--- DIAGNOSTICS ---`);
          console.log(`PDF local extraction completed. Extracted text length: ${extractedTextForValidation.length} characters.`);
          console.log(`-------------------\n`);
        } catch (e) {
          console.warn("pdf-parse extraction failed", e);
        } finally {
          await parser.destroy();
        }
      } else if (mimeType === 'text/plain') {
        extractedTextForValidation = fs.readFileSync(filePath, 'utf-8');
      }

      let allTopics = new Set();
      let allSubjects = new Set();
      let allQuestions = [];

      async function generateFromContent(contents) {
        const result = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: contents
        });
        let responseText = result.text;
        responseText = responseText.replace(/^```json\n?/m, '').replace(/\n?```$/m, '').trim();
        return JSON.parse(responseText);
      }

      // 2. Generate questions
      if (mimeType === 'application/pdf' && req.file.size > MAX_PDF_BYTES) {
        console.log(`PDF exceeds 50MB. Falling back to text-extraction chunking.`);
        if (extractedTextForValidation.length < 500) {
          return res.status(413).json({ 
            error: 'This PDF appears to be scanned or image-based and has no extractable text. Please provide a smaller or text-based version.' 
          });
        }

        // Chunking (~10,000 characters, up to a max of 10 chunks to avoid extreme rate limits)
        const chunkSize = Math.max(10000, Math.ceil(extractedTextForValidation.length / 10));
        const chunks = [];
        for (let i = 0; i < extractedTextForValidation.length; i += chunkSize) {
          chunks.push(extractedTextForValidation.substring(i, i + chunkSize));
        }

        console.log(`Split text into ${chunks.length} chunks.`);
        for (const chunk of chunks) {
          try {
            const parsedResponse = await generateFromContent([
              promptText,
              `\n\nDOCUMENT TEXT CONTENT:\n${chunk}`
            ]);
            (parsedResponse.extractedTopics || parsedResponse.topics || []).forEach(t => allTopics.add(t));
            (parsedResponse.detectedSubjects || parsedResponse.subjects || []).forEach(s => allSubjects.add(s));
            allQuestions.push(...(parsedResponse.generatedQuestions || parsedResponse.questions || []));
          } catch (e) {
            console.error("Failed to generate for chunk:", e);
          }
        }
      } else {
        // Upload via Files API for files < 50MB or non-PDFs
        console.log(`Uploading file to Gemini File API...`);
        uploadedFile = await ai.files.upload({
          file: filePath,
          config: {
            mimeType: mimeType,
            displayName: req.file.originalname,
          }
        });
        console.log(`Uploaded file as: ${uploadedFile.uri}`);

        let fileInfo = await ai.files.get({ name: uploadedFile.name });
        let attempts = 0;
        while (fileInfo.state === 'PROCESSING' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          fileInfo = await ai.files.get({ name: uploadedFile.name });
          attempts++;
        }

        if (fileInfo.state === 'FAILED') {
          throw new Error('Gemini failed to process the uploaded file.');
        }

        const parsedResponse = await generateFromContent([
          createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
          promptText
        ]);
        
        (parsedResponse.extractedTopics || parsedResponse.topics || []).forEach(t => allTopics.add(t));
        (parsedResponse.detectedSubjects || parsedResponse.subjects || []).forEach(s => allSubjects.add(s));
        allQuestions.push(...(parsedResponse.generatedQuestions || parsedResponse.questions || []));
      }

      // 3. Validation step: Check source_quote substring
      let validatedQuestions = allQuestions;
      console.log(`\n--- VALIDATION DIAGNOSTICS ---`);
      console.log(`Total raw questions generated before validation: ${allQuestions.length}`);
      
      if (extractedTextForValidation.length > 0) {
        const normalize = (str) => {
          if (!str) return '';
          return str.toLowerCase()
            .replace(/-\n/g, '') // remove hyphenation at line breaks
            .replace(/[\r\n]+/g, ' ') // replace newlines with space
            .replace(/\s+/g, ' ') // collapse multiple spaces
            .trim();
        };

        const lowerContext = normalize(extractedTextForValidation);
        
        let passedCount = 0;
        let failedCount = 0;

        validatedQuestions = allQuestions.filter(q => {
          if (!q.source_quote) {
            console.log(`[FAIL] Question missing source_quote completely. ID: ${q.id}`);
            failedCount++;
            return false;
          }
          
          const quote = normalize(q.source_quote);
          if (quote.length < 10) {
            console.log(`[FAIL] Quote too short. Quote: "${q.source_quote}"`);
            failedCount++;
            return false;
          }
          
          const matched = lowerContext.includes(quote);
          if (!matched) {
            console.log(`[FAIL] Quote not found in text.\nRaw Quote: "${q.source_quote}"\nNormalized Quote: "${quote}"\nMatch Result: ${matched}`);
            failedCount++;
            return false;
          }

          passedCount++;
          return true;
        });
        console.log(`Validation Results -> Passed: ${passedCount} | Failed: ${failedCount}`);
        console.log(`------------------------------\n`);
      }

      if (validatedQuestions.length === 0) {
        return res.status(500).json({ error: 'No grounded questions could be generated from this file. The model hallucinated or found no relevant mechanical engineering concepts.' });
      }

      res.json({
        extractedTopics: Array.from(allTopics),
        detectedSubjects: Array.from(allSubjects),
        generatedQuestions: validatedQuestions
      });

    } catch (error) {
      console.error('Scan Notes Route Error:', error);
      if (error.status === 429 || error.status === 403 || error.status === 400) {
        return res.status(error.status).json({ error: error.message });
      }
      return res.status(500).json({ error: error.message || 'Server error while scanning note document.' });
    } finally {
      if (uploadedFile && uploadedFile.name) {
        try {
          await ai.files.delete({ name: uploadedFile.name });
          console.log(`Successfully deleted file from Gemini API: ${uploadedFile.name}`);
        } catch (cleanupErr) {
          console.error('Error cleaning up file from Gemini API:', cleanupErr);
        }
      }
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.error('Error cleaning up local file:', cleanupErr);
        }
      }
    }
  });
}

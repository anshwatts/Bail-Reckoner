import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { searchOffenses } from './statutes.js';
import { checkBailEligibility } from './bail.js';
import { caseRecordSchema } from './schemas.js';
import { processDocument } from './pipeline.js';
import { createBailPetition } from './draft.js';
import { createCase } from './cases.js';
import prisma from './db.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.get('/api/offenses', (req, res) => {
  const query = req.query.q || '';
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const results = searchOffenses(String(query), limit);
  res.json(results);
});

app.post('/api/check', (req, res) => {
  try {
    const validated = caseRecordSchema.parse(req.body);
    const result = checkBailEligibility(validated);
    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors || err.message
    });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const mimeType = req.file.mimetype || 'application/pdf';
    const defaultLlmCaller = async ({ userPrompt }) => {
      const text = userPrompt || '';
      const accusedMatch = text.match(
        /(?:State\s+(?:v\.|vs\.?|versus)\s+([A-Za-z\s]+?)(?:\.\.\.|\n|$)|against\s+([A-Za-z\s]+?)(?:u\/s|\n|$)|Accused:\s*([A-Za-z\s]+?)(?:\n|$))/i
      );
      const accusedName = accusedMatch
        ? (accusedMatch[1] || accusedMatch[2] || accusedMatch[3]).trim()
        : null;

      const firMatch = text.match(/FIR\s*(?:No\.?)?\s*[:\s]*([0-9]+\s*\/\s*[0-9]{4}|[0-9]+)/i);
      const firNumber = firMatch ? firMatch[1].replace(/\s+/g, '') : null;

      const psMatch = text.match(/(?:PS|Police\s+Station)\s*[:\s]*([A-Za-z]+)/i);
      const policeStation = psMatch ? psMatch[1].trim() : null;

      const distMatch = text.match(/District\s*[:\s]*([A-Za-z]+)/i);
      const district = distMatch ? distMatch[1].trim() : null;

      const dateMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
      const arrestDate = dateMatches[0] || null;
      const remandDate = dateMatches[1] || (arrestDate ? arrestDate : null);

      const sections = [];
      const secMatches =
        text.match(
          /\b(?:303\(2\)|304|420|406|323|325|506|392|302|103\(1\)|109|307|160|194|379)\b(?:\s*(?:BNS|IPC))?/gi
        ) || [];
      for (const m of secMatches) {
        if (!sections.includes(m.trim())) {
          sections.push(m.trim());
        }
      }

      return JSON.stringify({
        accusedName,
        firNumber,
        policeStation,
        district,
        arrestDate,
        remandDate,
        chargesheetDate: null,
        rawSections: sections,
        confidence: 0.9,
        missingFields: []
      });
    };

    const result = await processDocument(req.file.buffer, {
      mimeType,
      llmCaller: defaultLlmCaller
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/petition', (req, res) => {
  try {
    const { caseData, eligibilityResult, courtDetails, options } = req.body;
    const petition = createBailPetition(caseData, eligibilityResult, courtDetails, options);
    res.json(petition);
  } catch (err) {
    res.status(400).json({
      error: 'Failed to generate petition',
      details: err.errors || err.message
    });
  }
});

app.get('/api/cases', async (req, res) => {
  try {
    const cases = await prisma.case.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        accused: true,
        offenses: true,
        assessments: {
          orderBy: { checkedAt: 'desc' },
          take: 1
        }
      }
    });
    res.json(cases);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/cases', async (req, res) => {
  try {
    const userId = req.body.userId || 'system-advocate';
    const created = await createCase(userId, req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({
      error: 'Failed to create case',
      details: err.errors || err.message
    });
  }
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {});
}

export { app };
export default app;

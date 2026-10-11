import path from 'path';
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { z } from 'zod';
import { DocumentAnalysis } from '../models/DocumentAnalysis';
import { asData, completeJSON, SAFETY_RULES } from '../services/aiService';
import { extractText, MAX_BYTES } from '../services/documentService';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeDoc } from '../utils/profile';

const NOT_SPECIFIED = 'Not specified in the provided document.';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });

export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) =>
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return next(new AppError(400, err.code === 'LIMIT_FILE_SIZE' ? 'That file is larger than 5 MB.' : 'The upload failed. Please try again.'));
    }
    next(err as Error | undefined);
  });

const docSchema = z.object({
  summary: z.string().default(''),
  purpose: z.string().default(''),
  eligibility: z.array(z.string()).default([]),
  requiredDocuments: z.array(z.string()).default([]),
  importantDates: z.array(z.string()).default([]),
  applicationSteps: z.array(z.string()).default([]),
  importantConditions: z.array(z.string()).default([]),
  questionsToVerify: z.array(z.string()).default([]),
});

const SYSTEM = `You extract key information from an opportunity/application document (scholarship notice, job post, programme brochure, etc.).
Return JSON with: summary (3-4 sentences), purpose, eligibility[], requiredDocuments[], importantDates[] (strings like "Application deadline: 30 June"), applicationSteps[], importantConditions[], questionsToVerify[] (things the applicant should confirm with the organiser).
Strict rules:
- Use ONLY information that appears in the document. Do not infer, guess or use outside knowledge.
- If the document does not mention something, use the single string "${NOT_SPECIFIED}" for that field (as the only array item, or as the string value).
- Quote dates and amounts exactly as written.
${SAFETY_RULES}`;

async function analyze(userId: string, filename: string, text: string, truncated: boolean, charCount: number) {
  const a = await completeJSON(docSchema, SYSTEM, asData('document', text), 3000);
  const fill = (v: string[]) => (v.filter((x) => x.trim()).length ? v : [NOT_SPECIFIED]);
  const analysis = {
    summary: a.summary.trim() || NOT_SPECIFIED,
    purpose: a.purpose.trim() || NOT_SPECIFIED,
    eligibility: fill(a.eligibility),
    requiredDocuments: fill(a.requiredDocuments),
    importantDates: fill(a.importantDates),
    applicationSteps: fill(a.applicationSteps),
    importantConditions: fill(a.importantConditions),
    questionsToVerify: fill(a.questionsToVerify),
  };
  // Only the structured analysis is stored; the file and its raw text are discarded.
  const doc = await DocumentAnalysis.create({ userId, filename, truncated, charCount, analysis });
  return serializeDoc(doc.toObject());
}

const safeName = (n: string) => path.basename(n).replace(/[^\w.\- ()]/g, '').slice(0, 120) || 'document';

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(400, 'Please choose a file to upload.');
  const { text, truncated, charCount } = await extractText(req.file.buffer, req.file.originalname);
  res.status(201).json({ item: await analyze(req.user!.id, safeName(req.file.originalname), text, truncated, charCount) });
});

export const analyzeTextSchema = z.object({
  text: z.string().trim().min(50, 'Please paste at least a few sentences.').max(30_000, 'That text is too long (30,000 characters max).'),
  title: z.string().trim().max(120).optional(),
});
export const analyzeDocumentText = asyncHandler(async (req: Request, res: Response) => {
  const { text, title } = req.body;
  res.status(201).json({ item: await analyze(req.user!.id, title || 'Pasted text', text, false, text.length) });
});

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const items = await DocumentAnalysis.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(50).select('filename createdAt').lean();
  res.json({ items: items.map(serializeDoc) });
});

export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  const d = await DocumentAnalysis.findOne({ _id: req.params.id, userId: req.user!.id }).lean();
  if (!d) throw new AppError(404, "We couldn't find that analysis.");
  res.json({ item: serializeDoc(d) });
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid identifier.');
  await DocumentAnalysis.deleteOne({ _id: req.params.id, userId: req.user!.id });
  res.json({ message: 'Analysis deleted.' });
});

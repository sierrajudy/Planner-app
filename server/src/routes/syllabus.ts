import { Router } from "express";
import multer from "multer";
import { extractText } from "../lib/textExtract.js";
import { extractSyllabusItems } from "../lib/extract.js";

export const syllabusRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

syllabusRouter.post("/parse", upload.single("file"), async (req, res) => {
  try {
    let text = "";
    if (req.file) {
      text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    } else if (typeof req.body?.text === "string") {
      text = req.body.text;
    } else {
      return res.status(400).json({ error: "Upload a file (field 'file') or provide 'text'." });
    }

    if (!text.trim()) {
      return res.status(422).json({ error: "Couldn't find any text in that file." });
    }

    const referenceYear = req.body?.referenceYear
      ? Number(req.body.referenceYear)
      : new Date().getFullYear();
    const referenceMonth = req.body?.referenceMonth ? Number(req.body.referenceMonth) : undefined;

    const items = extractSyllabusItems(text, { referenceYear, referenceMonth });
    res.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse syllabus";
    res.status(500).json({ error: message });
  }
});

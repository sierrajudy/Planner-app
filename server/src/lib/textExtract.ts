import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export async function extractText(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const lower = filename.toLowerCase();

  if (mimetype === "application/pdf" || lower.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimetype.startsWith("text/") || lower.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${mimetype || filename}`);
}

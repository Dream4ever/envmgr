import fs from "node:fs/promises";
import path from "node:path";

const AUDIT_FILE = path.join(process.cwd(), "data", "audit.log");

export default defineEventHandler(async () => {
  try {
    const content = await fs.readFile(AUDIT_FILE, "utf8");
    const lines = content.trim().split(/\r?\n/).filter(Boolean);
    const recent = lines.slice(-200).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
    return { entries: recent };
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return { entries: [] };
    }
    throw error;
  }
});

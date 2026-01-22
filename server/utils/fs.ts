import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readFileIfExists(filePath: string, encoding: BufferEncoding = "utf8") {
  try {
    const content = await fs.readFile(filePath, encoding);
    return { content, exists: true };
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return { content: "", exists: false };
    }
    throw error;
  }
}

export async function writeFileSafe(filePath: string, content: string) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

export async function appendFileSafe(filePath: string, content: string) {
  await ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, content, "utf8");
}

export async function readJsonIfExists<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeJson(filePath: string, data: unknown) {
  await writeFileSafe(filePath, JSON.stringify(data, null, 2) + "\n");
}

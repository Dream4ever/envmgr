import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { ensureDir, readJsonIfExists, writeJson, appendFileSafe } from "./fs";
import type { ProjectsFile, EnvKey } from "~/shared/types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const AUDIT_FILE = path.join(DATA_DIR, "audit.log");
const WORKSPACE_DIR = path.join(DATA_DIR, "workspace");

export async function ensureDataStore() {
  await ensureDir(DATA_DIR);
  await ensureDir(WORKSPACE_DIR);
  try {
    await fs.access(PROJECTS_FILE);
  } catch {
    await writeJson(PROJECTS_FILE, { projects: [] });
  }
}

export async function readProjectsFile(): Promise<ProjectsFile> {
  await ensureDataStore();
  return readJsonIfExists<ProjectsFile>(PROJECTS_FILE, { projects: [] });
}

export async function writeProjectsFile(data: ProjectsFile) {
  await ensureDataStore();
  await writeJson(PROJECTS_FILE, data);
}

export function createProjectId() {
  return randomUUID();
}

export async function appendAudit(entry: Record<string, unknown>) {
  await ensureDataStore();
  const line = JSON.stringify({
    time: new Date().toISOString(),
    ...entry
  }) + "\n";
  await appendFileSafe(AUDIT_FILE, line);
}

export function getWorkspacePath(projectId: string, env: EnvKey, file: string) {
  return path.join(WORKSPACE_DIR, projectId, env, file);
}

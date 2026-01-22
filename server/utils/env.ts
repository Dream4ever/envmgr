import { readFileIfExists, writeFileSafe } from "./fs";
import { resolveLocalPath } from "./paths";
import { getWorkspacePath } from "./storage";
import type { EnvKey } from "~/shared/types";

export async function readLocalEnv(basePath: string, file: string) {
  const filePath = resolveLocalPath(basePath, file);
  const { content, exists } = await readFileIfExists(filePath);
  return { content, exists, path: filePath };
}

export async function writeLocalEnv(basePath: string, file: string, content: string) {
  const filePath = resolveLocalPath(basePath, file);
  await writeFileSafe(filePath, content);
  return filePath;
}

export async function readWorkspaceEnv(projectId: string, env: EnvKey, file: string) {
  const filePath = getWorkspacePath(projectId, env, file);
  const { content, exists } = await readFileIfExists(filePath);
  return { content, exists, path: filePath };
}

export async function writeWorkspaceEnv(projectId: string, env: EnvKey, file: string, content: string) {
  const filePath = getWorkspacePath(projectId, env, file);
  await writeFileSafe(filePath, content);
  return filePath;
}

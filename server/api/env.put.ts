import { readBody, getQuery, createError } from "h3";
import { assertEnvKey, validateDotEnv } from "../utils/validation";
import { getProject, getEnvConfig, assertFileAllowed } from "../utils/projects";
import { writeLocalEnv, writeWorkspaceEnv } from "../utils/env";
import { appendAudit } from "../utils/storage";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const projectId = String(query.projectId || "").trim();
  const env = assertEnvKey(String(query.env || ""));
  const file = String(query.file || "").trim();

  if (!projectId || !file) {
    throw createError({ statusCode: 400, statusMessage: "projectId and file are required" });
  }

  const body = await readBody(event);
  const content = String(body?.content ?? "");

  const project = await getProject(projectId);
  const config = getEnvConfig(project, env);
  assertFileAllowed(config, file);

  const warnings = validateDotEnv(content).warnings;

  let targetPath = "";
  if (env === "local") {
    targetPath = await writeLocalEnv(config.basePath, file, content);
  }

  const workspacePath = await writeWorkspaceEnv(projectId, env, file, content);
  await appendAudit({ action: "env.save", projectId, env, file });

  return {
    ok: true,
    targetPath: targetPath || null,
    workspacePath,
    warnings
  };
});

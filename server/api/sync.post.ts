import { readBody, createError } from "h3";
import { assertEnvKey } from "~/server/utils/validation";
import { getProject, getEnvConfig, assertFileAllowed } from "~/server/utils/projects";
import { uploadRemoteFile } from "~/server/utils/ssh";
import { readWorkspaceEnv } from "~/server/utils/env";
import { appendAudit } from "~/server/utils/storage";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const projectId = String(body?.projectId || "").trim();
  const env = assertEnvKey(String(body?.env || ""));
  const file = String(body?.file || "").trim();

  if (!projectId || !file) {
    throw createError({ statusCode: 400, statusMessage: "projectId and file are required" });
  }
  if (env === "local") {
    throw createError({ statusCode: 400, statusMessage: "sync is only for remote envs" });
  }

  const project = await getProject(projectId);
  const config = getEnvConfig(project, env);
  assertFileAllowed(config, file);

  if (!config.hostAlias) {
    throw createError({ statusCode: 400, statusMessage: "hostAlias is required" });
  }

  const workspace = await readWorkspaceEnv(projectId, env, file);
  if (!workspace.exists) {
    throw createError({ statusCode: 400, statusMessage: "workspace file not found" });
  }

  const remotePath = await uploadRemoteFile(config.hostAlias, config.basePath, file, workspace.path);
  await appendAudit({ action: "env.sync", projectId, env, file, remotePath });

  return { ok: true, remotePath };
});

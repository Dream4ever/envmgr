import { getQuery, createError } from "h3";
import { assertEnvKey, validateDotEnv } from "~/server/utils/validation";
import { getProject, getEnvConfig, assertFileAllowed } from "~/server/utils/projects";
import { readLocalEnv, readWorkspaceEnv } from "~/server/utils/env";
import { readRemoteFile } from "~/server/utils/ssh";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const projectId = String(query.projectId || "").trim();
  const env = assertEnvKey(String(query.env || ""));
  const file = String(query.file || "").trim();

  if (!projectId || !file) {
    throw createError({ statusCode: 400, statusMessage: "projectId and file are required" });
  }

  const project = await getProject(projectId);
  const config = getEnvConfig(project, env);
  assertFileAllowed(config, file);

  let content = "";
  let exists = false;
  let source = "";
  let path = "";

  if (env === "local") {
    const local = await readLocalEnv(config.basePath, file);
    content = local.content;
    exists = local.exists;
    source = "local";
    path = local.path;
  } else {
    if (!config.hostAlias) {
      throw createError({ statusCode: 400, statusMessage: "hostAlias is required" });
    }
    const remote = await readRemoteFile(config.hostAlias, config.basePath, file);
    content = remote.content;
    exists = remote.exists;
    source = "remote";
    path = remote.path;
  }

  const workspace = await readWorkspaceEnv(projectId, env, file);
  const warnings = validateDotEnv(content).warnings;

  return {
    content,
    exists,
    source,
    path,
    warnings,
    workspace: {
      exists: workspace.exists,
      content: workspace.content
    }
  };
});

import { getQuery, createError } from "h3";
import { diffLines } from "diff";
import { assertEnvKey } from "../utils/validation";
import { getProject, getEnvConfig, assertFileAllowed } from "../utils/projects";
import { readLocalEnv, readWorkspaceEnv } from "../utils/env";
import { readRemoteFile } from "../utils/ssh";

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

  let baseContent = "";
  if (env === "local") {
    const local = await readLocalEnv(config.basePath, file);
    baseContent = local.content;
  } else {
    if (!config.hostAlias) {
      throw createError({ statusCode: 400, statusMessage: "hostAlias is required" });
    }
    const remote = await readRemoteFile(config.hostAlias, config.basePath, file);
    baseContent = remote.content;
  }

  const workspace = await readWorkspaceEnv(projectId, env, file);
  if (!workspace.exists) {
    return { diff: [], message: "workspace not found" };
  }

  const diff = diffLines(baseContent, workspace.content);
  return {
    diff
  };
});

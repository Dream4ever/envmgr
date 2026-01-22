import { readBody, createError } from "h3";
import type { EnvKey, EnvConfig, Project } from "#shared/types";
import { ENV_KEYS } from "#shared/types";
import { createProjectId, readProjectsFile, writeProjectsFile, appendAudit } from "../utils/storage";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = String(body?.name || "").trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "name is required" });
  }

  const envs = {} as Record<EnvKey, EnvConfig>;
  for (const key of ENV_KEYS) {
    const raw = body?.envs?.[key] || {};
    const basePath = String(raw.basePath || "").trim();
    const files = Array.isArray(raw.files)
      ? raw.files.map((item: string) => String(item).trim()).filter(Boolean)
      : [];
    envs[key] = {
      basePath,
      hostAlias: raw.hostAlias ? String(raw.hostAlias).trim() : undefined,
      files,
      notes: raw.notes ? String(raw.notes).trim() : undefined
    };
  }

  const project: Project = {
    id: createProjectId(),
    name,
    envs,
    notes: body?.notes ? String(body.notes).trim() : undefined
  };

  const data = await readProjectsFile();
  data.projects.push(project);
  await writeProjectsFile(data);
  await appendAudit({ action: "project.create", projectId: project.id, name: project.name });

  return project;
});

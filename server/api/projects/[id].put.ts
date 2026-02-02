import { readBody, createError } from "h3";
import { ENV_KEYS, type EnvConfig, type EnvKey } from "#shared/types";
import { readProjectsFile, writeProjectsFile, appendAudit } from "../../utils/storage";

export default defineEventHandler(async (event) => {
  const projectId = event.context.params?.id;
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: "project id is required" });
  }
  const body = await readBody(event);
  const data = await readProjectsFile();
  const project = data.projects.find((item) => item.id === projectId);
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: "project not found" });
  }

  if (body?.name) {
    project.name = String(body.name).trim();
  }
  if (body?.notes !== undefined) {
    project.notes = body.notes ? String(body.notes).trim() : undefined;
  }

  if (body?.envs) {
    for (const key of ENV_KEYS) {
      const raw = body.envs[key];
      if (!raw) {
        continue;
      }
      const config = project.envs[key as EnvKey];
      const nextUploadMode =
        raw.uploadMode !== undefined
          ? raw.uploadMode === "sudo" || raw.uploadMode === "direct"
            ? raw.uploadMode
            : undefined
          : config.uploadMode;
      const nextUploadTmpDir =
        raw.uploadTmpDir !== undefined
          ? raw.uploadTmpDir
            ? String(raw.uploadTmpDir).trim()
            : undefined
          : config.uploadTmpDir;
      const next: EnvConfig = {
        basePath: raw.basePath !== undefined ? String(raw.basePath).trim() : config.basePath,
        hostAlias: raw.hostAlias !== undefined ? String(raw.hostAlias).trim() : config.hostAlias,
        files: Array.isArray(raw.files)
          ? raw.files.map((item: string) => String(item).trim()).filter(Boolean)
          : config.files,
        notes: raw.notes !== undefined ? String(raw.notes).trim() : config.notes,
        uploadMode: nextUploadMode,
        uploadTmpDir: nextUploadTmpDir
      };
      project.envs[key as EnvKey] = next;
    }
  }

  await writeProjectsFile(data);
  await appendAudit({ action: "project.update", projectId });
  return project;
});

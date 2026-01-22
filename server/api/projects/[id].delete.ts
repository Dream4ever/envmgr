import { createError } from "h3";
import { readProjectsFile, writeProjectsFile, appendAudit } from "~/server/utils/storage";

export default defineEventHandler(async (event) => {
  const projectId = event.context.params?.id;
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: "project id is required" });
  }

  const data = await readProjectsFile();
  const next = data.projects.filter((item) => item.id !== projectId);
  if (next.length === data.projects.length) {
    throw createError({ statusCode: 404, statusMessage: "project not found" });
  }
  data.projects = next;
  await writeProjectsFile(data);
  await appendAudit({ action: "project.delete", projectId });
  return { ok: true };
});

import { createError } from "h3";
import { readProjectsFile } from "../../utils/storage";

export default defineEventHandler(async (event) => {
  const projectId = event.context.params?.id;
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: "project id is required" });
  }
  const data = await readProjectsFile();
  const project = data.projects.find((item) => item.id === projectId);
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: "project not found" });
  }
  return project;
});

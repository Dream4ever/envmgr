import { createError } from "h3";
import type { Project, EnvKey, EnvConfig } from "~/shared/types";
import { readProjectsFile } from "./storage";

export async function getProject(projectId: string): Promise<Project> {
  const data = await readProjectsFile();
  const project = data.projects.find((item) => item.id === projectId);
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: "project not found" });
  }
  return project;
}

export function getEnvConfig(project: Project, env: EnvKey): EnvConfig {
  const config = project.envs[env];
  if (!config) {
    throw createError({ statusCode: 404, statusMessage: "env config not found" });
  }
  if (!config.basePath) {
    throw createError({ statusCode: 400, statusMessage: "basePath is required" });
  }
  return config;
}

export function assertFileAllowed(config: EnvConfig, file: string) {
  if (!config.files?.includes(file)) {
    throw createError({ statusCode: 400, statusMessage: "file not allowed" });
  }
}

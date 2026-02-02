export const ENV_KEYS = ["local", "campus", "aliyun"] as const;

export type EnvKey = (typeof ENV_KEYS)[number];

export type EnvUploadMode = "direct" | "sudo";

export type EnvConfig = {
  hostAlias?: string;
  basePath: string;
  files: string[];
  notes?: string;
  uploadMode?: EnvUploadMode;
  uploadTmpDir?: string;
};

export type Project = {
  id: string;
  name: string;
  envs: Record<EnvKey, EnvConfig>;
  notes?: string;
};

export type ProjectsFile = {
  projects: Project[];
};

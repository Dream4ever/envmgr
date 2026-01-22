import path from "node:path";
import { createError } from "h3";

const SAFE_REMOTE_PATH = /^[A-Za-z0-9._~/-]+$/;

export function assertSafeRemotePath(value: string, label: string) {
  if (!value || !SAFE_REMOTE_PATH.test(value) || value.includes("..")) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} contains unsafe characters`
    });
  }
}

export function resolveLocalPath(basePath: string, file: string) {
  if (!basePath) {
    throw createError({ statusCode: 400, statusMessage: "basePath is required" });
  }
  if (path.isAbsolute(file)) {
    throw createError({ statusCode: 400, statusMessage: "file must be relative" });
  }
  const baseResolved = path.resolve(basePath);
  const target = path.resolve(basePath, file);
  const basePrefix = baseResolved.endsWith(path.sep) ? baseResolved : baseResolved + path.sep;
  if (!target.startsWith(basePrefix)) {
    throw createError({ statusCode: 400, statusMessage: "file path is outside basePath" });
  }
  return target;
}

export function resolveRemotePath(basePath: string, file: string) {
  if (!basePath) {
    throw createError({ statusCode: 400, statusMessage: "basePath is required" });
  }
  if (file.startsWith("/")) {
    throw createError({ statusCode: 400, statusMessage: "file must be relative" });
  }
  assertSafeRemotePath(basePath, "basePath");
  assertSafeRemotePath(file, "file");
  return path.posix.join(basePath, file);
}

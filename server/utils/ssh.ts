import path from "node:path";
import type { EnvConfig } from "#shared/types";
import { runCommand } from "./command";
import { assertSafeRemotePath, resolveRemotePath } from "./paths";

const SSH_OPTIONS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"];
const DEFAULT_UPLOAD_TMP_DIR = "/tmp/envmgr";

function buildTmpName(file: string) {
  const base = path.posix.basename(file);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}.${stamp}.${rand}`;
}

function resolveTmpPath(tmpDir: string, file: string) {
  assertSafeRemotePath(tmpDir, "uploadTmpDir");
  assertSafeRemotePath(file, "file");
  return path.posix.join(tmpDir, file);
}

export async function readRemoteFile(hostAlias: string, basePath: string, file: string) {
  const remotePath = resolveRemotePath(basePath, file);
  try {
    const result = await runCommand("ssh", [...SSH_OPTIONS, hostAlias, "cat", remotePath]);
    return { content: result.stdout, exists: true, path: remotePath };
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message.includes("No such file") || message.includes("not found")) {
      return { content: "", exists: false, path: remotePath };
    }
    throw error;
  }
}

async function uploadWithSudo(
  hostAlias: string,
  remotePath: string,
  localPath: string,
  file: string,
  tmpDir: string
) {
  const tmpName = buildTmpName(file);
  const tmpPath = resolveTmpPath(tmpDir, tmpName);
  await runCommand("ssh", [...SSH_OPTIONS, hostAlias, "mkdir", "-p", tmpDir]);
  await runCommand("scp", [...SSH_OPTIONS, localPath, `${hostAlias}:${tmpPath}`]);
  try {
    await runCommand("ssh", [...SSH_OPTIONS, hostAlias, "sudo", "-n", "mv", tmpPath, remotePath]);
  } catch (error) {
    try {
      await runCommand("ssh", [...SSH_OPTIONS, hostAlias, "rm", "-f", tmpPath]);
    } catch {
      // Best-effort cleanup; ignore.
    }
    throw error;
  }
  return remotePath;
}

export async function uploadRemoteFile(
  hostAlias: string,
  config: EnvConfig,
  file: string,
  localPath: string
) {
  const remotePath = resolveRemotePath(config.basePath, file);
  if (config.uploadMode !== "sudo") {
    await runCommand("scp", [...SSH_OPTIONS, localPath, `${hostAlias}:${remotePath}`]);
    return remotePath;
  }
  const tmpDir = config.uploadTmpDir?.trim() || DEFAULT_UPLOAD_TMP_DIR;
  return uploadWithSudo(hostAlias, remotePath, localPath, file, tmpDir);
}

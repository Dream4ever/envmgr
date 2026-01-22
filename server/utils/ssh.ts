import { runCommand } from "./command";
import { resolveRemotePath } from "./paths";

const SSH_OPTIONS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"];

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

export async function uploadRemoteFile(hostAlias: string, basePath: string, file: string, localPath: string) {
  const remotePath = resolveRemotePath(basePath, file);
  await runCommand("scp", [...SSH_OPTIONS, localPath, `${hostAlias}:${remotePath}`]);
  return remotePath;
}

import { createError } from "h3";
import { ENV_KEYS, type EnvKey } from "#shared/types";

const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertEnvKey(value: string): EnvKey {
  if (!ENV_KEYS.includes(value as EnvKey)) {
    throw createError({ statusCode: 400, statusMessage: "invalid env key" });
  }
  return value as EnvKey;
}

export function validateDotEnv(content: string) {
  const warnings: string[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      warnings.push(`Line ${index + 1}: missing '='`);
      return;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    if (!ENV_KEY_RE.test(key)) {
      warnings.push(`Line ${index + 1}: invalid key '${key}'`);
    }
  });
  return { warnings };
}

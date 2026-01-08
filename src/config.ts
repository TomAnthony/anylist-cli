import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ExitCode } from "./types.js";
import { printError } from "./output.js";

export interface AnyListConfig {
  email: string;
  password: string;
}

const CONFIG_DIR = join(homedir(), ".config", "anylist-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Load config from file
 */
export function loadConfig(): AnyListConfig | null {
  if (!existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const data = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data) as AnyListConfig;
  } catch {
    return null;
  }
}

/**
 * Load config from environment variables
 */
export function loadConfigFromEnv(): AnyListConfig | null {
  const email = process.env["ANYLIST_EMAIL"];
  const password = process.env["ANYLIST_PASSWORD"];

  if (email && password) {
    return { email, password };
  }
  return null;
}

/**
 * Save config to file
 */
export function saveConfig(config: AnyListConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600, // read/write for owner only
  });
}

/**
 * Clear stored config
 */
export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE);
  }
  // Also clear the anylist library's credentials file
  const anylistCreds = join(homedir(), ".anylist_credentials");
  if (existsSync(anylistCreds)) {
    unlinkSync(anylistCreds);
  }
}

/**
 * Get config, preferring env vars over file
 * Exits with appropriate code if not configured
 */
export function requireConfig(): AnyListConfig {
  // Try env vars first (higher precedence)
  const envConfig = loadConfigFromEnv();
  if (envConfig) {
    return envConfig;
  }

  // Fall back to file
  const fileConfig = loadConfig();
  if (fileConfig?.email && fileConfig?.password) {
    return fileConfig;
  }

  printError("Not authenticated. Run: anylist auth");
  printError(
    "Or set ANYLIST_EMAIL and ANYLIST_PASSWORD environment variables."
  );
  process.exit(ExitCode.AuthFailure);
}

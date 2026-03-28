import * as fs from "fs";
import { randomUUID } from "crypto";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SCRIPTS_DIR = path.join(__dirname, "scripts");
export const TEMP_DIR = path.join(__dirname, "temp");

/** Verbose bridge logging (paths, sizes). Default off so stderr stays clean for MCP. */
export const AE_MCP_DEBUG = process.env.AE_MCP_DEBUG === "1" || process.env.AE_MCP_DEBUG === "true";

export function logDebug(...args: unknown[]): void {
  if (AE_MCP_DEBUG) console.error("[ae-mcp]", ...args);
}

/** Redact paths and long strings when logging parameters (AE_MCP_DEBUG). */
export function redactForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > 200 ? `[string ${value.length} chars]` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redactForLog(v));
  }
  const sensitive = new Set([
    "filePath",
    "outputPath",
    "projectPath",
    "presetPath",
    "expressionString",
    "aerenderPath",
  ]);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value as object)) {
    const v = (value as Record<string, unknown>)[k];
    if (sensitive.has(k) && typeof v === "string") {
      out[k] = v.length > 64 ? `[redacted ${v.length} chars]` : "[redacted]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = redactForLog(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Replace-on-Windows: rename over an existing file can throw EPERM; unlink target first when needed. */
function safeRenameSync(tmpPath: string, destPath: string): void {
  try {
    fs.renameSync(tmpPath, destPath);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "EPERM" || err.code === "EEXIST" || err.code === "EBUSY") {
      try {
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
      } catch {
        /* ignore */
      }
      fs.renameSync(tmpPath, destPath);
    } else {
      throw e;
    }
  }
}

export function readPackageVersion(): string {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/** ~/Documents/ae-mcp-bridge — shared with the After Effects ScriptUI panel. */
export function getAETempDir(): string {
  const bridgeDir = path.join(os.homedir(), "Documents", "ae-mcp-bridge");
  if (!fs.existsSync(bridgeDir)) {
    fs.mkdirSync(bridgeDir, { recursive: true });
  }
  return bridgeDir;
}

export function readResultsFromTempFile(): string {
  try {
    const tempFilePath = path.join(getAETempDir(), "ae_mcp_result.json");
    logDebug("Checking for results at:", tempFilePath);

    if (fs.existsSync(tempFilePath)) {
      const stats = fs.statSync(tempFilePath);
      logDebug("Result file exists, last modified:", stats.mtime.toISOString());

      const content = fs.readFileSync(tempFilePath, "utf8");
      logDebug("Result file content length:", content.length, "bytes");

      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      if (stats.mtime < thirtySecondsAgo) {
        logDebug("WARNING: Result file is older than 30 seconds.");
        return JSON.stringify({
          warning: "Result file appears to be stale (not recently updated).",
          message:
            "This could indicate After Effects is not properly writing results or the MCP Bridge Auto panel isn't running.",
          lastModified: stats.mtime.toISOString(),
          originalContent: content,
        });
      }

      return content;
    }
    logDebug("Result file not found at:", tempFilePath);
    return JSON.stringify({
      error: "No results file found. Please run a script in After Effects first.",
    });
  } catch (error) {
    console.error("Error reading results file:", error);
    return JSON.stringify({ error: `Failed to read results: ${String(error)}` });
  }
}

export async function waitForBridgeResult(
  expectedCommand?: string,
  timeoutMs: number = 5000,
  pollMs: number = 250,
  expectedCommandId?: string
): Promise<string> {
  const start = Date.now();
  const resultPath = path.join(getAETempDir(), "ae_mcp_result.json");

  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(resultPath)) {
      try {
        const content = fs.readFileSync(resultPath, "utf8");
        if (!content || !content.trim()) {
          await new Promise((r) => setTimeout(r, pollMs));
          continue;
        }
        try {
          const parsed = JSON.parse(content) as {
            _commandExecuted?: string;
            _commandId?: string;
            status?: string;
          };
          // Reset file written by clearResultsFile — not a command result yet
          if (parsed.status === "waiting") {
            await new Promise((r) => setTimeout(r, pollMs));
            continue;
          }
          if (expectedCommandId) {
            if (parsed._commandId === expectedCommandId) {
              if (!expectedCommand || parsed._commandExecuted === expectedCommand) {
                return content;
              }
            } else if (
              (parsed._commandId === undefined || parsed._commandId === null || parsed._commandId === "") &&
              expectedCommand &&
              parsed._commandExecuted === expectedCommand
            ) {
              // Older MCP Bridge panel that omits _commandId in the result JSON
              return content;
            }
          } else if (expectedCommand) {
            if (parsed._commandExecuted === expectedCommand) {
              return content;
            }
          } else {
            return content;
          }
        } catch {
          // not JSON yet; continue polling
        }
      } catch {
        // transient read error; continue polling
      }
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return JSON.stringify({
    error: `Timed out waiting for bridge result${expectedCommand ? ` for command '${expectedCommand}'` : ""}${expectedCommandId ? ` (commandId ${expectedCommandId})` : ""}.`,
  });
}

/**
 * Atomically writes ae_command.json (temp + rename). Returns commandId for correlation with ae_mcp_result.json.
 */
export function writeCommandFile(command: string, args: Record<string, unknown> = {}): string {
  const commandId = randomUUID();
  const commandData = {
    command,
    args,
    commandId,
    timestamp: new Date().toISOString(),
    status: "pending",
  };
  try {
    const dir = getAETempDir();
    const commandFile = path.join(dir, "ae_command.json");
    const tmpFile = path.join(dir, "ae_command.json.tmp");
    const payload = JSON.stringify(commandData, null, 2);
    fs.writeFileSync(tmpFile, payload, "utf8");
    safeRenameSync(tmpFile, commandFile);
    logDebug(`Command "${command}" written to ${commandFile}`, "commandId:", commandId);
    if (AE_MCP_DEBUG) {
      logDebug("args (redacted):", redactForLog(args));
    }
    return commandId;
  } catch (error) {
    console.error("Error writing command file:", error);
    return "";
  }
}

export function clearResultsFile(): void {
  try {
    const resultFile = path.join(getAETempDir(), "ae_mcp_result.json");
    const resetData = {
      status: "waiting",
      message: "Waiting for new result from After Effects...",
      timestamp: new Date().toISOString(),
    };
    const tmp = resultFile + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(resetData, null, 2), "utf8");
    safeRenameSync(tmp, resultFile);
    logDebug("Results file cleared at", resultFile);
  } catch (error) {
    console.error("Error clearing results file:", error);
  }
}

export interface BridgeStatusPayload {
  version: string;
  bridgeDir: string;
  scriptsDir: string;
  debugLogging: boolean;
  resultFile: {
    exists: boolean;
    path: string;
    mtime?: string;
    stale?: boolean;
    ageMs?: number;
    /** True if result file was modified within the last 60s (AE may be responding). */
    likelyConnected?: boolean;
  };
  commandFile: {
    exists: boolean;
    path: string;
    pending?: { command?: string; status?: string; timestamp?: string; commandId?: string };
    parseError?: boolean;
  };
}

export function getBridgeStatus(version: string): BridgeStatusPayload {
  const bridgeDir = getAETempDir();
  const resultPath = path.join(bridgeDir, "ae_mcp_result.json");
  const commandPath = path.join(bridgeDir, "ae_command.json");

  let resultFile: BridgeStatusPayload["resultFile"] = {
    exists: false,
    path: resultPath,
  };
  if (fs.existsSync(resultPath)) {
    const st = fs.statSync(resultPath);
    const stale = st.mtimeMs < Date.now() - 30_000;
    const ageMs = Date.now() - st.mtimeMs;
    resultFile = {
      exists: true,
      path: resultPath,
      mtime: st.mtime.toISOString(),
      stale,
      ageMs,
      likelyConnected: ageMs < 60_000,
    };
  }

  let commandFile: BridgeStatusPayload["commandFile"] = {
    exists: false,
    path: commandPath,
  };
  if (fs.existsSync(commandPath)) {
    try {
      const raw = fs.readFileSync(commandPath, "utf8");
      const parsed = JSON.parse(raw) as {
        command?: string;
        status?: string;
        timestamp?: string;
        commandId?: string;
      };
      commandFile = {
        exists: true,
        path: commandPath,
        pending: {
          command: parsed.command,
          status: parsed.status,
          timestamp: parsed.timestamp,
          commandId: parsed.commandId,
        },
      };
    } catch {
      commandFile = { exists: true, path: commandPath, parseError: true };
    }
  }

  return {
    version,
    bridgeDir,
    scriptsDir: SCRIPTS_DIR,
    debugLogging: AE_MCP_DEBUG,
    resultFile,
    commandFile,
  };
}

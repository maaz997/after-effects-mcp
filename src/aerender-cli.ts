import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

/** Default aerender locations (override with AE_AERENDER_PATH). */
export function defaultAerenderPath(): string {
  const env = process.env.AE_AERENDER_PATH;
  if (env && env.length > 0) {
    return env;
  }
  if (process.platform === "darwin") {
    const candidates = [
      "/Applications/Adobe After Effects 2026/aerender",
      "/Applications/Adobe After Effects 2026/Adobe After Effects 2026.app/Contents/MacOS/aerender",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return candidates[0];
  }
  const win = path.join(
    "C:\\Program Files\\Adobe\\Adobe After Effects 2026\\Support Files",
    "aerender.exe"
  );
  if (fs.existsSync(win)) {
    return win;
  }
  return win;
}

export interface AerenderResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Spawn Adobe aerender (must exist on disk). Blocks until exit.
 * Typical args: -project path -comp "Name" -output path -OMtemplate "Lossless" -RStemplate "Best Settings"
 */
export function runAerender(argv: string[], exePath?: string): Promise<AerenderResult> {
  const exe = exePath && fs.existsSync(exePath) ? exePath : defaultAerenderPath();
  if (!fs.existsSync(exe)) {
    return Promise.resolve({
      code: 127,
      stdout: "",
      stderr: `aerender not found at ${exe}. Set AE_AERENDER_PATH.`,
    });
  }
  return new Promise((resolve) => {
    const child = spawn(exe, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}

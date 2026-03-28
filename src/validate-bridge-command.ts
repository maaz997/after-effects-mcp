import * as path from "path";

/** Max steps per executeBatch (DoS guard). */
export const MAX_BATCH_COMMANDS = 100;

/** Max steps per applySceneSpec. */
export const MAX_SCENE_SPEC_STEPS = 150;

/** Max serialized parameters size (chars) for run-script payloads. */
export const MAX_PAYLOAD_BYTES = 512 * 1024;

/**
 * Optional comma-separated list in AE_MCP_DENIED_COMMANDS (e.g. "importFootage,addToRenderQueue").
 */
export function getDeniedCommandSet(): Set<string> {
  const raw = process.env.AE_MCP_DENIED_COMMANDS || "";
  const set = new Set<string>();
  for (const s of raw.split(",")) {
    const t = s.trim();
    if (t) {
      set.add(t);
    }
  }
  return set;
}

export function validatePayloadSize(parameters: Record<string, unknown>): string | null {
  try {
    const n = JSON.stringify(parameters).length;
    if (n > MAX_PAYLOAD_BYTES) {
      return `Request too large (${n} chars; max ${MAX_PAYLOAD_BYTES}).`;
    }
  } catch {
    return "parameters could not be serialized for size check.";
  }
  return null;
}

export function validateDeniedCommand(script: string, denied: Set<string>): string | null {
  if (denied.has(script)) {
    return `Command "${script}" is denied (AE_MCP_DENIED_COMMANDS).`;
  }
  return null;
}

/**
 * Returns an error message if parameters are invalid, or null if OK.
 */
export function validateBridgeParameters(
  script: string,
  parameters: Record<string, unknown>,
  allowed: Set<string>,
  denied: Set<string> = getDeniedCommandSet()
): string | null {
  const pe = validatePayloadSize(parameters);
  if (pe) {
    return pe;
  }
  const de = validateDeniedCommand(script, denied);
  if (de) {
    return de;
  }
  if (script === "executeBatch") {
    return validateExecuteBatch(parameters, allowed, denied);
  }
  if (script === "applySceneSpec") {
    return validateApplySceneSpec(parameters, allowed, denied);
  }
  if (script === "importFootage") {
    return validateImportFootageArgs(parameters);
  }
  return null;
}

function validateExecuteBatch(
  parameters: Record<string, unknown>,
  allowed: Set<string>,
  denied: Set<string>
): string | null {
  const commands = parameters.commands;
  if (!Array.isArray(commands)) {
    return "executeBatch requires parameters.commands to be an array.";
  }
  if (commands.length === 0) {
    return "executeBatch requires at least one command.";
  }
  if (commands.length > MAX_BATCH_COMMANDS) {
    return `executeBatch: at most ${MAX_BATCH_COMMANDS} commands allowed.`;
  }
  for (let i = 0; i < commands.length; i++) {
    const row = commands[i];
    if (!row || typeof row !== "object") {
      return `executeBatch: commands[${i}] must be an object with { command, args }.`;
    }
    const cmd = (row as { command?: unknown }).command;
    if (typeof cmd !== "string" || !cmd.length) {
      return `executeBatch: commands[${i}].command must be a non-empty string.`;
    }
    if (cmd === "executeBatch") {
      return "executeBatch: nested executeBatch is not allowed.";
    }
    if (!allowed.has(cmd)) {
      return `executeBatch: disallowed command "${cmd}" at index ${i}.`;
    }
    if (denied.has(cmd)) {
      return `executeBatch: command "${cmd}" denied at index ${i} (AE_MCP_DENIED_COMMANDS).`;
    }
    const args = (row as { args?: unknown }).args;
    if (args !== undefined && args !== null && typeof args !== "object") {
      return `executeBatch: commands[${i}].args must be an object when provided.`;
    }
    const argObj = args as Record<string, unknown> | undefined;
    if (cmd === "importFootage") {
      const e = validateImportFootageArgs(argObj ?? {});
      if (e) {
        return `executeBatch step ${i} (${cmd}): ${e}`;
      }
    }
  }
  return null;
}

export function validateApplySceneSpec(
  parameters: Record<string, unknown>,
  allowed: Set<string>,
  denied: Set<string>
): string | null {
  const spec = (parameters.spec as Record<string, unknown> | undefined) ?? parameters;
  if (!spec || typeof spec !== "object") {
    return "applySceneSpec requires parameters.spec (or root) with version and steps.";
  }
  if (spec.version !== 1) {
    return "applySceneSpec: spec.version must be 1.";
  }
  const hasComp =
    (typeof spec.compName === "string" && spec.compName.length > 0) ||
    (spec.createComp !== undefined && spec.createComp !== null);
  if (!hasComp) {
    return "applySceneSpec: set spec.compName and/or spec.createComp.";
  }
  if (spec.createComp !== undefined && spec.createComp !== null) {
    if (typeof spec.createComp !== "object") {
      return "applySceneSpec: createComp must be an object.";
    }
    const cc = spec.createComp as Record<string, unknown>;
    if (typeof cc.name !== "string" || !cc.name.length) {
      return "applySceneSpec: createComp.name is required when createComp is set.";
    }
  }
  const steps = spec.steps;
  if (!Array.isArray(steps)) {
    return "applySceneSpec: spec.steps must be an array.";
  }
  if (steps.length === 0) {
    return "applySceneSpec: at least one step required.";
  }
  if (steps.length > MAX_SCENE_SPEC_STEPS) {
    return `applySceneSpec: at most ${MAX_SCENE_SPEC_STEPS} steps.`;
  }
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    if (!st || typeof st !== "object") {
      return `applySceneSpec: steps[${i}] must be an object.`;
    }
    const invoke = (st as { invoke?: unknown; command?: unknown }).invoke ?? (st as { command?: unknown }).command;
    if (typeof invoke !== "string" || !invoke.length) {
      return `applySceneSpec: steps[${i}].invoke (or .command) required.`;
    }
    if (invoke === "executeBatch" || invoke === "applySceneSpec") {
      return `applySceneSpec: cannot invoke "${invoke}" from a scene step.`;
    }
    if (!allowed.has(invoke)) {
      return `applySceneSpec: disallowed invoke "${invoke}" at step ${i}.`;
    }
    if (denied.has(invoke)) {
      return `applySceneSpec: invoke "${invoke}" denied at step ${i}.`;
    }
    const sa = (st as { args?: unknown }).args;
    if (sa !== undefined && sa !== null && typeof sa !== "object") {
      return `applySceneSpec: steps[${i}].args must be an object when provided.`;
    }
    if (invoke === "importFootage") {
      const e = validateImportFootageArgs((sa as Record<string, unknown>) ?? {});
      if (e) {
        return `applySceneSpec step ${i}: ${e}`;
      }
    }
  }
  return null;
}

/**
 * Optional: set AE_MCP_IMPORT_ROOT to an absolute directory; imports must resolve under it.
 */
export function validateImportFootageArgs(parameters: Record<string, unknown>): string | null {
  const fp = parameters.filePath;
  if (typeof fp !== "string" || !fp.trim()) {
    return "importFootage requires parameters.filePath (non-empty string).";
  }
  const trimmed = fp.trim();
  if (trimmed.includes("..")) {
    return "importFootage: filePath must not contain parent directory segments (..).";
  }
  const root = process.env.AE_MCP_IMPORT_ROOT;
  if (root && root.length > 0) {
    const absRoot = path.resolve(root);
    const absFile = path.resolve(trimmed);
    const sep = path.sep;
    if (absFile !== absRoot && !absFile.startsWith(absRoot + sep)) {
      return `importFootage: filePath must be under AE_MCP_IMPORT_ROOT (${absRoot}).`;
    }
  }
  return null;
}

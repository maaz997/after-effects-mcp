import * as path from "path";

/** Max steps per executeBatch (DoS guard). */
export const MAX_BATCH_COMMANDS = 100;

/** Max steps per applySceneSpec. */
export const MAX_SCENE_SPEC_STEPS = 150;

/** Max serialized parameters size (chars) for run-script payloads. */
export const MAX_PAYLOAD_BYTES = 512 * 1024;

export type ValidationResult = { ok: true } | { ok: false; code: string; message: string };

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

function fail(code: string, message: string): ValidationResult {
  return { ok: false, code, message };
}

export function validatePayloadSize(parameters: Record<string, unknown>): ValidationResult {
  try {
    const n = JSON.stringify(parameters).length;
    if (n > MAX_PAYLOAD_BYTES) {
      return fail("PAYLOAD_TOO_LARGE", `Request too large (${n} chars; max ${MAX_PAYLOAD_BYTES}).`);
    }
  } catch {
    return fail("SERIALIZE_FAILED", "parameters could not be serialized for size check.");
  }
  return { ok: true };
}

export function validateDeniedCommand(script: string, denied: Set<string>): ValidationResult {
  if (denied.has(script)) {
    return fail("COMMAND_DENIED", `Command "${script}" is denied (AE_MCP_DENIED_COMMANDS).`);
  }
  return { ok: true };
}

/**
 * Full validation with machine-readable `code` for clients.
 */
export function validateBridgeParametersFull(
  script: string,
  parameters: Record<string, unknown>,
  allowed: Set<string>,
  denied: Set<string> = getDeniedCommandSet()
): ValidationResult {
  let r: ValidationResult = validatePayloadSize(parameters);
  if (!r.ok) {
    return r;
  }
  r = validateDeniedCommand(script, denied);
  if (!r.ok) {
    return r;
  }
  if (script === "executeBatch") {
    return validateExecuteBatch(parameters, allowed, denied);
  }
  if (script === "applySceneSpec") {
    return validateApplySceneSpec(parameters, allowed, denied);
  }
  if (script === "importFootage") {
    return validateImportFootageArgsFull(parameters);
  }
  return { ok: true };
}

/**
 * @deprecated Prefer validateBridgeParametersFull for structured errors; kept for callers expecting string|null.
 */
export function validateBridgeParameters(
  script: string,
  parameters: Record<string, unknown>,
  allowed: Set<string>,
  denied: Set<string> = getDeniedCommandSet()
): string | null {
  const r = validateBridgeParametersFull(script, parameters, allowed, denied);
  return r.ok ? null : r.message;
}

function validateExecuteBatch(
  parameters: Record<string, unknown>,
  allowed: Set<string>,
  denied: Set<string>
): ValidationResult {
  const commands = parameters.commands;
  if (!Array.isArray(commands)) {
    return fail("EXECUTE_BATCH_NOT_ARRAY", "executeBatch requires parameters.commands to be an array.");
  }
  if (commands.length === 0) {
    return fail("EXECUTE_BATCH_EMPTY", "executeBatch requires at least one command.");
  }
  if (commands.length > MAX_BATCH_COMMANDS) {
    return fail("EXECUTE_BATCH_TOO_MANY", `executeBatch: at most ${MAX_BATCH_COMMANDS} commands allowed.`);
  }
  for (let i = 0; i < commands.length; i++) {
    const row = commands[i];
    if (!row || typeof row !== "object") {
      return fail("EXECUTE_BATCH_STEP_INVALID", `executeBatch: commands[${i}] must be an object with { command, args }.`);
    }
    const cmd = (row as { command?: unknown }).command;
    if (typeof cmd !== "string" || !cmd.length) {
      return fail("EXECUTE_BATCH_COMMAND_INVALID", `executeBatch: commands[${i}].command must be a non-empty string.`);
    }
    if (cmd === "executeBatch") {
      return fail("EXECUTE_BATCH_NESTED", "executeBatch: nested executeBatch is not allowed.");
    }
    if (!allowed.has(cmd)) {
      return fail("EXECUTE_BATCH_DISALLOWED", `executeBatch: disallowed command "${cmd}" at index ${i}.`);
    }
    if (denied.has(cmd)) {
      return fail("EXECUTE_BATCH_DENIED", `executeBatch: command "${cmd}" denied at index ${i} (AE_MCP_DENIED_COMMANDS).`);
    }
    const args = (row as { args?: unknown }).args;
    if (args !== undefined && args !== null && typeof args !== "object") {
      return fail("EXECUTE_BATCH_ARGS_INVALID", `executeBatch: commands[${i}].args must be an object when provided.`);
    }
    const argObj = args as Record<string, unknown> | undefined;
    if (cmd === "importFootage") {
      const ir = validateImportFootageArgsFull(argObj ?? {});
      if (!ir.ok) {
        return fail(ir.code, `executeBatch step ${i} (${cmd}): ${ir.message}`);
      }
    }
  }
  return { ok: true };
}

function validateApplySceneSpec(
  parameters: Record<string, unknown>,
  allowed: Set<string>,
  denied: Set<string>
): ValidationResult {
  const spec = (parameters.spec as Record<string, unknown> | undefined) ?? parameters;
  if (!spec || typeof spec !== "object") {
    return fail("APPLY_SCENE_SPEC_INVALID", "applySceneSpec requires parameters.spec (or root) with version and steps.");
  }
  if (spec.version !== 1) {
    return fail("APPLY_SCENE_SPEC_VERSION", "applySceneSpec: spec.version must be 1.");
  }
  const hasComp =
    (typeof spec.compName === "string" && spec.compName.length > 0) ||
    (spec.createComp !== undefined && spec.createComp !== null);
  if (!hasComp) {
    return fail("APPLY_SCENE_SPEC_NO_COMP", "applySceneSpec: set spec.compName and/or spec.createComp.");
  }
  if (spec.createComp !== undefined && spec.createComp !== null) {
    if (typeof spec.createComp !== "object") {
      return fail("APPLY_SCENE_SPEC_CREATECOMP", "applySceneSpec: createComp must be an object.");
    }
    const cc = spec.createComp as Record<string, unknown>;
    if (typeof cc.name !== "string" || !cc.name.length) {
      return fail("APPLY_SCENE_SPEC_CREATECOMP_NAME", "applySceneSpec: createComp.name is required when createComp is set.");
    }
  }
  const steps = spec.steps;
  if (!Array.isArray(steps)) {
    return fail("APPLY_SCENE_SPEC_STEPS_TYPE", "applySceneSpec: spec.steps must be an array.");
  }
  if (steps.length === 0) {
    return fail("APPLY_SCENE_SPEC_EMPTY", "applySceneSpec: at least one step required.");
  }
  if (steps.length > MAX_SCENE_SPEC_STEPS) {
    return fail("APPLY_SCENE_SPEC_TOO_MANY", `applySceneSpec: at most ${MAX_SCENE_SPEC_STEPS} steps.`);
  }
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    if (!st || typeof st !== "object") {
      return fail("APPLY_SCENE_SPEC_STEP_INVALID", `applySceneSpec: steps[${i}] must be an object.`);
    }
    const invoke = (st as { invoke?: unknown; command?: unknown }).invoke ?? (st as { command?: unknown }).command;
    if (typeof invoke !== "string" || !invoke.length) {
      return fail("APPLY_SCENE_SPEC_INVOKE_INVALID", `applySceneSpec: steps[${i}].invoke (or .command) required.`);
    }
    if (invoke === "executeBatch" || invoke === "applySceneSpec") {
      return fail("APPLY_SCENE_SPEC_INVOKE_FORBIDDEN", `applySceneSpec: cannot invoke "${invoke}" from a scene step.`);
    }
    if (!allowed.has(invoke)) {
      return fail("APPLY_SCENE_SPEC_DISALLOWED", `applySceneSpec: disallowed invoke "${invoke}" at step ${i}.`);
    }
    if (denied.has(invoke)) {
      return fail("APPLY_SCENE_SPEC_DENIED", `applySceneSpec: invoke "${invoke}" denied at step ${i}.`);
    }
    const sa = (st as { args?: unknown }).args;
    if (sa !== undefined && sa !== null && typeof sa !== "object") {
      return fail("APPLY_SCENE_SPEC_ARGS_INVALID", `applySceneSpec: steps[${i}].args must be an object when provided.`);
    }
    if (invoke === "importFootage") {
      const ir = validateImportFootageArgsFull((sa as Record<string, unknown>) ?? {});
      if (!ir.ok) {
        return fail(ir.code, `applySceneSpec step ${i}: ${ir.message}`);
      }
    }
  }
  return { ok: true };
}

function validateImportFootageArgsFull(parameters: Record<string, unknown>): ValidationResult {
  const fp = parameters.filePath;
  if (typeof fp !== "string" || !fp.trim()) {
    return fail("IMPORT_FOOTAGE_PATH", "importFootage requires parameters.filePath (non-empty string).");
  }
  const trimmed = fp.trim();
  if (trimmed.includes("..")) {
    return fail("IMPORT_FOOTAGE_PATH", "importFootage: filePath must not contain parent directory segments (..).");
  }
  const root = process.env.AE_MCP_IMPORT_ROOT;
  if (root && root.length > 0) {
    const absRoot = path.resolve(root);
    const absFile = path.resolve(trimmed);
    const sep = path.sep;
    if (absFile !== absRoot && !absFile.startsWith(absRoot + sep)) {
      return fail(
        "IMPORT_FOOTAGE_ROOT",
        `importFootage: filePath must be under AE_MCP_IMPORT_ROOT (${absRoot}).`
      );
    }
  }
  return { ok: true };
}

/**
 * Optional: set AE_MCP_IMPORT_ROOT to an absolute directory; imports must resolve under it.
 */
export function validateImportFootageArgs(parameters: Record<string, unknown>): string | null {
  const r = validateImportFootageArgsFull(parameters);
  return r.ok ? null : r.message;
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_PAYLOAD_BYTES, validateBridgeParametersFull, validateImportFootageArgs } from "./validate-bridge-command.js";
import { ALLOWED_SCRIPT_NAMES } from "./constants.js";

const allowed = new Set<string>(ALLOWED_SCRIPT_NAMES);

describe("validateBridgeParametersFull", () => {
  it("accepts listCompositions with empty parameters", () => {
    const denied = new Set<string>();
    const r = validateBridgeParametersFull("listCompositions", {}, allowed, denied);
    assert.equal(r.ok, true);
  });

  it("rejects oversized payload", () => {
    const denied = new Set<string>();
    const big = "x".repeat(MAX_PAYLOAD_BYTES + 1);
    const r = validateBridgeParametersFull("listCompositions", { _pad: big }, allowed, denied);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, "PAYLOAD_TOO_LARGE");
    }
  });

  it("rejects nested executeBatch", () => {
    const denied = new Set<string>();
    const r = validateBridgeParametersFull(
      "executeBatch",
      { commands: [{ command: "executeBatch", args: {} }] },
      allowed,
      denied
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, "EXECUTE_BATCH_NESTED");
    }
  });

  it("rejects denied top-level command", () => {
    const denied = new Set(["importFootage"]);
    const r = validateBridgeParametersFull("importFootage", { filePath: "/tmp/a.mov" }, allowed, denied);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, "COMMAND_DENIED");
    }
  });

  it("applySceneSpec requires version 1", () => {
    const denied = new Set<string>();
    const r = validateBridgeParametersFull(
      "applySceneSpec",
      { spec: { version: 2, compName: "A", steps: [{ invoke: "renameLayer", args: {} }] } },
      allowed,
      denied
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, "APPLY_SCENE_SPEC_VERSION");
    }
  });
});

describe("validateImportFootageArgs", () => {
  it("rejects parent segments", () => {
    assert.ok(validateImportFootageArgs({ filePath: "/tmp/../etc/passwd" }));
  });

  it("accepts simple absolute path", () => {
    assert.equal(validateImportFootageArgs({ filePath: "/Users/foo/bar.png" }), null);
  });
});

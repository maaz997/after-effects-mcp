import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { z } from "zod";
import {
  clearResultsFile,
  getBridgeStatus,
  logDebug,
  readPackageVersion,
  readResultsFromTempFile,
  SCRIPTS_DIR,
  TEMP_DIR,
  waitForBridgeResult,
  writeCommandFile,
} from "./bridge.js";
import {
  ALLOWED_SCRIPT_NAMES,
  EFFECT_TEMPLATE_IDS,
  EXPRESSION_SNIPPETS,
  EffectTemplateSchema,
  KeyframeValueSchema,
  LayerIdentifierSchema,
  SCENE_SPEC_VERSION,
} from "./constants.js";
import { getDeniedCommandSet, validateBridgeParameters } from "./validate-bridge-command.js";
import { runAerender } from "./aerender-cli.js";

const SERVER_VERSION = readPackageVersion();

const server = new McpServer({
  name: "AfterEffectsServer",
  version: SERVER_VERSION,
});

function textOk(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function textErr(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

server.resource("compositions", "aftereffects://compositions", async (uri) => {
  clearResultsFile();
  writeCommandFile("listCompositions", {});
  const result = await waitForBridgeResult("listCompositions", 6000, 250);

  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: result,
      },
    ],
  };
});

server.tool(
  "run-script",
  "Run a predefined script in After Effects via the bridge (commands are allowlisted).",
  {
    script: z.string().describe("Name of the predefined script to run"),
    parameters: z.record(z.any()).optional().describe("Optional parameters for the script"),
    waitForResult: z
      .boolean()
      .optional()
      .describe(
        "If true, block until the bridge reports a result for this command (or timeout). Default: queue only."
      ),
    waitTimeoutMs: z
      .number()
      .int()
      .positive()
      .max(120_000)
      .optional()
      .describe("Max milliseconds to wait when waitForResult is true (default 15000)."),
  },
  async ({ script, parameters = {}, waitForResult, waitTimeoutMs }) => {
    const allowed = new Set<string>(ALLOWED_SCRIPT_NAMES);
    if (!allowed.has(script)) {
      return textErr(
        `Error: Script "${script}" is not allowed. Allowed scripts are: ${ALLOWED_SCRIPT_NAMES.join(", ")}`
      );
    }

    const denied = getDeniedCommandSet();
    const validationError = validateBridgeParameters(script, parameters, allowed, denied);
    if (validationError) {
      return textErr(`Error: ${validationError}`);
    }

    const dryRun = parameters.dryRun === true;
    if (dryRun) {
      if (script !== "executeBatch" && script !== "applySceneSpec") {
        return textErr('Error: parameters.dryRun is only supported for "executeBatch" and "applySceneSpec".');
      }
      if (script === "executeBatch") {
        const cmds = parameters.commands;
        const n = Array.isArray(cmds) ? cmds.length : 0;
        return textOk(JSON.stringify({ dryRun: true, ok: true, command: script, commandCount: n }, null, 2));
      }
      const spec = (parameters.spec as { steps?: unknown[] } | undefined) ?? parameters;
      const n = Array.isArray(spec.steps) ? spec.steps.length : 0;
      return textOk(JSON.stringify({ dryRun: true, ok: true, command: script, stepCount: n, specVersion: SCENE_SPEC_VERSION }, null, 2));
    }

    try {
      clearResultsFile();
      const bridgeArgs = { ...parameters };
      delete bridgeArgs.dryRun;
      writeCommandFile(script, bridgeArgs as Record<string, unknown>);

      if (waitForResult) {
        const timeout = waitTimeoutMs ?? 15_000;
        const result = await waitForBridgeResult(script, timeout, 250);
        return textOk(result);
      }

      return textOk(
        `Command to run "${script}" has been queued.\n` +
          `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
          `Use the "get-results" tool after a few seconds to check for results, or call run-script with waitForResult: true.`
      );
    } catch (error) {
      return textErr(`Error queuing command: ${String(error)}`);
    }
  }
);

server.tool(
  "get-results",
  "Get results from the last script executed in After Effects",
  {},
  async () => {
    try {
      const result = readResultsFromTempFile();
      return textOk(result);
    } catch (error) {
      return textErr(`Error getting results: ${String(error)}`);
    }
  }
);

server.tool(
  "bridge-status",
  "Inspect bridge paths and whether command/result JSON files exist (useful for troubleshooting).",
  {},
  async () => {
    try {
      const status = getBridgeStatus(SERVER_VERSION);
      return textOk(JSON.stringify(status, null, 2));
    } catch (error) {
      return textErr(`Error reading bridge status: ${String(error)}`);
    }
  }
);

server.tool(
  "list-expression-snippets",
  "Return preset After Effects expression strings (for prompts). Does not require the AE bridge.",
  {},
  async () => {
    return textOk(JSON.stringify(EXPRESSION_SNIPPETS, null, 2));
  }
);

server.prompt("list-compositions", "List compositions in the current After Effects project", () => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Please list all compositions in the current After Effects project.",
      },
    },
  ],
}));

server.prompt(
  "analyze-composition",
  {
    compositionName: z.string().describe("Name of the composition to analyze"),
  },
  (args) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please analyze the composition named "${args.compositionName}" in the current After Effects project. Provide details about its duration, frame rate, resolution, and layers.`,
        },
      },
    ],
  })
);

server.prompt("create-composition", "Create a new composition with specified settings", () => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Please create a new composition with custom settings. You can specify parameters like name, width, height, frame rate, etc.",
      },
    },
  ],
}));

server.tool("get-help", "Get help on using the After Effects MCP integration", {}, async () => {
  return {
    content: [
      {
        type: "text",
        text: `# After Effects MCP Integration Help

To use this integration with After Effects, follow these steps:

**Version:** After Effects **2026 (26.x)** and **2025 (25.x)** are supported. On AE 25+, the bridge panel runs as a **floating window only** (Adobe does not support docking this ScriptUI panel).

1. **Install the scripts in After Effects**
   - Run \`node install-bridge.js\` (may need elevated permissions to write to the AE Scripts folder)
   - This copies the bridge panel to your After Effects installation

2. **Open After Effects** and your project

3. **Open the MCP Bridge Auto panel**
   - Window → the installed MCP bridge panel; it polls for \`ae_command.json\`

4. **Run scripts through MCP**
   - Use \`run-script\` to queue a command (optional: \`waitForResult: true\` to poll for JSON)
   - Use \`bridge-status\` if something fails (paths, stale files)

5. **Get results**
   - \`get-results\` after the bridge runs, or use \`run-script\` with \`waitForResult: true\`

**Debugging:** set environment variable \`AE_MCP_DEBUG=1\` to log bridge paths and file sizes to stderr.

**Bridge API 2.0:** Use \`getBridgeCapabilities\` in After Effects for app version info. Results include \`_bridgeApiVersion\`. Chain multiple operations with \`executeBatch\` (\`commands: [{ command, args }, ...]\`, optional \`continueOnError\`; max 100 steps, validated server-side). Prefer \`compName\` or \`compIndex\` (project item index) for compositions.

**Import safety:** \`importFootage\` rejects paths containing \`..\`. Set env \`AE_MCP_IMPORT_ROOT\` to restrict imports to one directory tree.

**Denied commands:** env \`AE_MCP_DENIED_COMMANDS\` (comma-separated) blocks those bridge commands even if allowlisted.

**Scene spec:** \`applySceneSpec\` with \`spec: { version: 1, compName?, createComp?, steps: [{ invoke, args }] }\` runs many bridge ops in one undo group. Use \`parameters.dryRun: true\` with \`executeBatch\` or \`applySceneSpec\` to validate only (no AE write).

**Rigging / layers:** \`createNullLayer\`, \`setTrackMatte\`, \`renameLayer\`, \`addMaskToLayer\`, \`setMaskProperties\`, \`copyEffectsFromLayer\`, \`setSourceTextKeyframe\`, \`setAudioLevelKeyframes\`, \`setKeyframeTemporalEase\`, \`snapshotLayerState\`, \`createPlaceholderSolid\`.

**Rendering:** Use tool \`run-aerender\` for command-line render (set \`AE_AERENDER_PATH\` if needed). Save the project in AE first.

**Expression presets:** use the \`list-expression-snippets\` tool (no bridge required).

Available scripts:
${ALLOWED_SCRIPT_NAMES.map((s) => `- \`${s}\``).join("\n")}

Effect template IDs: ${EFFECT_TEMPLATE_IDS.join(", ")}
`,
      },
    ],
  };
});

server.tool(
  "create-composition",
  "Create a new composition in After Effects with specified parameters",
  {
    name: z.string().describe("Name of the composition"),
    width: z.number().int().positive().describe("Width of the composition in pixels"),
    height: z.number().int().positive().describe("Height of the composition in pixels"),
    pixelAspect: z.number().positive().optional().describe("Pixel aspect ratio (default: 1.0)"),
    duration: z.number().positive().optional().describe("Duration in seconds (default: 10.0)"),
    frameRate: z.number().positive().optional().describe("Frame rate in frames per second (default: 30.0)"),
    backgroundColor: z
      .object({
        r: z.number().int().min(0).max(255),
        g: z.number().int().min(0).max(255),
        b: z.number().int().min(0).max(255),
      })
      .optional()
      .describe("Background color of the composition (RGB values 0-255)"),
  },
  async (params) => {
    try {
      writeCommandFile("createComposition", params);
      return textOk(
        `Command to create composition "${params.name}" has been queued.\n` +
          `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
          `Use the "get-results" tool after a few seconds to check for results.`
      );
    } catch (error) {
      return textErr(`Error queuing composition creation: ${String(error)}`);
    }
  }
);

server.tool(
  "setLayerKeyframe",
  "Set a keyframe for a specific layer property at a given time.",
  {
    ...LayerIdentifierSchema,
    propertyName: z
      .string()
      .describe("Name of the property to keyframe (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
    timeInSeconds: z.number().describe("The time (in seconds) for the keyframe."),
    value: KeyframeValueSchema,
  },
  async (parameters) => {
    try {
      writeCommandFile("setLayerKeyframe", parameters);
      return textOk(
        `Command to set keyframe for "${parameters.propertyName}" on layer ${parameters.layerIndex} in comp ${parameters.compIndex} has been queued.\n` +
          `Use the "get-results" tool after a few seconds to check for confirmation.`
      );
    } catch (error) {
      return textErr(`Error queuing setLayerKeyframe command: ${String(error)}`);
    }
  }
);

server.tool(
  "setLayerExpression",
  "Set or remove an expression for a specific layer property.",
  {
    ...LayerIdentifierSchema,
    propertyName: z
      .string()
      .describe("Name of the property (e.g., 'Position', 'Scale', 'Rotation', 'Opacity')."),
    expressionString: z
      .string()
      .describe('The JavaScript expression string. Use "" to remove the expression.'),
  },
  async (parameters) => {
    try {
      writeCommandFile("setLayerExpression", parameters);
      return textOk(
        `Command to set expression for "${parameters.propertyName}" on layer ${parameters.layerIndex} in comp ${parameters.compIndex} has been queued.\n` +
          `Use the "get-results" tool after a few seconds to check for confirmation.`
      );
    } catch (error) {
      return textErr(`Error queuing setLayerExpression command: ${String(error)}`);
    }
  }
);

server.tool(
  "test-animation",
  "Test animation functionality in After Effects (writes a temporary .jsx for manual Run Script)",
  {
    operation: z.enum(["keyframe", "expression"]).describe("The animation operation to test"),
    compIndex: z.number().int().positive().describe("Composition index (usually 1)"),
    layerIndex: z.number().int().positive().describe("Layer index (usually 1)"),
  },
  async (params) => {
    try {
      const timestamp = new Date().getTime();
      const tmp = process.env.TEMP || process.env.TMP || os.tmpdir();
      const tempFile = path.join(tmp, `ae_test_${timestamp}.jsx`);

      let scriptContent = "";
      const escapedTmp = path.join(tmp, "ae_test_result.txt").replace(/\\/g, "\\\\");
      const errPath = path.join(tmp, "ae_test_error.txt").replace(/\\/g, "\\\\");

      if (params.operation === "keyframe") {
        scriptContent = `
          try {
            var comp = app.project.items[${params.compIndex}];
            var layer = comp.layers[${params.layerIndex}];
            var prop = layer.property("Transform").property("Opacity");
            var time = 1;
            var value = 25;
            prop.setValueAtTime(time, value);
            var resultFile = new File("${escapedTmp}");
            resultFile.open("w");
            resultFile.write("SUCCESS: Added keyframe at time " + time + " with value " + value);
            resultFile.close();
            alert("Test successful: Added opacity keyframe at " + time + "s with value " + value + "%");
          } catch (e) {
            var errorFile = new File("${errPath}");
            errorFile.open("w");
            errorFile.write("ERROR: " + e.toString());
            errorFile.close();
            alert("Test failed: " + e.toString());
          }
        `;
      } else if (params.operation === "expression") {
        scriptContent = `
          try {
            var comp = app.project.items[${params.compIndex}];
            var layer = comp.layers[${params.layerIndex}];
            var prop = layer.property("Transform").property("Position");
            var expression = "wiggle(3, 30)";
            prop.expression = expression;
            var resultFile = new File("${escapedTmp}");
            resultFile.open("w");
            resultFile.write("SUCCESS: Added expression: " + expression);
            resultFile.close();
            alert("Test successful: Added position expression: " + expression);
          } catch (e) {
            var errorFile = new File("${errPath}");
            errorFile.open("w");
            errorFile.write("ERROR: " + e.toString());
            errorFile.close();
            alert("Test failed: " + e.toString());
          }
        `;
      }

      fs.writeFileSync(tempFile, scriptContent);
      logDebug("Written test script to:", tempFile);

      return textOk(
        `I've created a direct test script for the ${params.operation} operation.\n\n` +
          `Run in After Effects: File → Scripts → Run Script File…\n` +
          `${tempFile}\n\n` +
          `This bypasses the MCP Bridge Auto panel and modifies the specified layer.`
      );
    } catch (error) {
      return textErr(`Error creating test script: ${String(error)}`);
    }
  }
);

server.tool(
  "apply-effect",
  "Apply an effect to a layer in After Effects",
  {
    compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
    layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
    effectName: z.string().optional().describe("Display name of the effect to apply (e.g., 'Gaussian Blur')."),
    effectMatchName: z
      .string()
      .optional()
      .describe("After Effects internal name for the effect (e.g., 'ADBE Gaussian Blur 2')."),
    effectCategory: z.string().optional().describe("Optional category for filtering effects."),
    presetPath: z.string().optional().describe("Optional path to an effect preset file (.ffx)."),
    effectSettings: z.record(z.any()).optional().describe("Optional parameters for the effect (e.g., { 'Blurriness': 25 })."),
  },
  async (parameters) => {
    try {
      writeCommandFile("applyEffect", parameters);
      return textOk(
        `Command to apply effect to layer ${parameters.layerIndex} in composition ${parameters.compIndex} has been queued.\n` +
          `Use the "get-results" tool after a few seconds to check for confirmation.`
      );
    } catch (error) {
      return textErr(`Error queuing apply-effect command: ${String(error)}`);
    }
  }
);

server.tool(
  "apply-effect-template",
  "Apply a predefined effect template to a layer in After Effects",
  {
    compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
    layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
    templateName: EffectTemplateSchema.describe("Name of the effect template to apply."),
    customSettings: z.record(z.any()).optional().describe("Optional custom settings to override defaults."),
  },
  async (parameters) => {
    try {
      writeCommandFile("applyEffectTemplate", parameters);
      return textOk(
        `Command to apply effect template '${parameters.templateName}' to layer ${parameters.layerIndex} in composition ${parameters.compIndex} has been queued.\n` +
          `Use the "get-results" tool after a few seconds to check for confirmation.`
      );
    } catch (error) {
      return textErr(`Error queuing apply-effect-template command: ${String(error)}`);
    }
  }
);

server.tool(
  "mcp_aftereffects_applyEffect",
  "Apply an effect to a layer in After Effects",
  {
    compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
    layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
    effectName: z.string().optional().describe("Display name of the effect to apply (e.g., 'Gaussian Blur')."),
    effectMatchName: z
      .string()
      .optional()
      .describe("After Effects internal name for the effect (more reliable, e.g., 'ADBE Gaussian Blur 2')."),
    effectSettings: z.record(z.any()).optional().describe("Optional parameters for the effect (e.g., { 'Blurriness': 25 })."),
  },
  async (parameters) => {
    try {
      writeCommandFile("applyEffect", parameters);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result = readResultsFromTempFile();
      return textOk(result);
    } catch (error) {
      return textErr(`Error applying effect: ${String(error)}`);
    }
  }
);

server.tool(
  "mcp_aftereffects_applyEffectTemplate",
  "Apply a predefined effect template to a layer in After Effects",
  {
    compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
    layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
    templateName: EffectTemplateSchema.describe("Name of the effect template to apply."),
    customSettings: z.record(z.any()).optional().describe("Optional custom settings to override defaults."),
  },
  async (parameters) => {
    try {
      writeCommandFile("applyEffectTemplate", parameters);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result = readResultsFromTempFile();
      return textOk(result);
    } catch (error) {
      return textErr(`Error applying effect template: ${String(error)}`);
    }
  }
);

server.tool("mcp_aftereffects_get_effects_help", "Get help on using After Effects effects", {}, async () => {
  return {
    content: [
      {
        type: "text",
        text: `# After Effects Effects Help

## Common Effect Match Names
These are internal names used by After Effects that can be used with the \`effectMatchName\` parameter:

### Blur & Sharpen
- Gaussian Blur: "ADBE Gaussian Blur 2"
- Camera Lens Blur: "ADBE Camera Lens Blur"
- Directional Blur: "ADBE Directional Blur"
- Radial Blur: "ADBE Radial Blur"
- Smart Blur: "ADBE Smart Blur"
- Unsharp Mask: "ADBE Unsharp Mask"

### Color Correction
- Brightness & Contrast: "ADBE Brightness & Contrast 2"
- Color Balance: "ADBE Color Balance (HLS)"
- Color Balance (RGB): "ADBE Pro Levels2"
- Curves: "ADBE CurvesCustom"
- Exposure: "ADBE Exposure2"
- Hue/Saturation: "ADBE HUE SATURATION"
- Levels: "ADBE Pro Levels2"
- Vibrance: "ADBE Vibrance"

### Stylistic
- Glow: "ADBE Glow"
- Drop Shadow: "ADBE Drop Shadow"
- Bevel Alpha: "ADBE Bevel Alpha"
- Noise: "ADBE Noise"
- Fractal Noise: "ADBE Fractal Noise"
- CC Particle World: "CC Particle World"
- CC Light Sweep: "CC Light Sweep"

## Effect Templates
${EFFECT_TEMPLATE_IDS.map((id) => `- \`${id}\``).join("\n")}

## Example Usage
\`\`\`json
{
  "compIndex": 1,
  "layerIndex": 1,
  "effectMatchName": "ADBE Gaussian Blur 2",
  "effectSettings": { "Blurriness": 25 }
}
\`\`\`
`,
      },
    ],
  };
});

server.tool(
  "run-aerender",
  "Run Adobe aerender CLI to render a comp (does not use the JSX bridge). Requires a saved project file. Set AE_AERENDER_PATH if aerender is not at the default 2026 location. WARNING: runs a subprocess.",
  {
    projectPath: z.string().describe("Absolute path to the saved .aep project file"),
    compName: z.string().describe("Composition name to render"),
    outputPath: z.string().describe("Absolute path for the output movie file (e.g. .mov)"),
    aerenderPath: z.string().optional().describe("Override path to aerender binary"),
    extraArgs: z.array(z.string()).optional().describe("Additional aerender arguments appended after defaults"),
  },
  async ({ projectPath, compName, outputPath, aerenderPath, extraArgs = [] }) => {
    if (!fs.existsSync(projectPath)) {
      return textErr(`Error: project file not found: ${projectPath}`);
    }
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      return textErr(`Error: output directory does not exist: ${outDir}`);
    }
    const argv = [
      "-project",
      projectPath,
      "-comp",
      compName,
      "-output",
      outputPath,
      ...extraArgs,
    ];
    try {
      const result = await runAerender(argv, aerenderPath);
      return textOk(
        JSON.stringify(
          {
            ok: result.code === 0,
            exitCode: result.code,
            stdout: result.stdout,
            stderr: result.stderr,
          },
          null,
          2
        )
      );
    } catch (error) {
      return textErr(`aerender failed: ${String(error)}`);
    }
  }
);

server.tool(
  "run-bridge-test",
  "Run the bridge test effects script to verify communication and apply test effects",
  {},
  async () => {
    try {
      clearResultsFile();
      writeCommandFile("bridgeTestEffects", {});
      return textOk(
        `Bridge test effects command has been queued.\n` +
          `Please ensure the "MCP Bridge Auto" panel is open in After Effects.\n` +
          `Use the "get-results" tool after a few seconds to check for the test results.`
      );
    } catch (error) {
      return textErr(`Error queuing bridge test command: ${String(error)}`);
    }
  }
);

async function main() {
  console.error(`After Effects MCP Server starting (v${SERVER_VERSION})...`);
  console.error(`Scripts directory: ${SCRIPTS_DIR}`);
  console.error(`Temp directory: ${TEMP_DIR}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("After Effects MCP Server running...");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

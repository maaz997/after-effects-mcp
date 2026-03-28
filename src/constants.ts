import { z } from "zod";

/** Scene spec schema version for `applySceneSpec`. */
export const SCENE_SPEC_VERSION = 1 as const;

/** Scripts the bridge may execute (must match ExtendScript command names). */
export const ALLOWED_SCRIPT_NAMES = [
  "listCompositions",
  "getProjectInfo",
  "getLayerInfo",
  "getBridgeCapabilities",
  "listLayersDetailed",
  "getCompositionDetails",
  "listProjectItems",
  "listTransformPropertyNames",
  "samplePropertyAtTime",
  "getPropertyKeyframeTimes",
  "duplicateLayer",
  "setLayerParent",
  "moveLayerToIndex",
  "setLayerBlendMode",
  "splitLayerAtTime",
  "precomposeLayers",
  "setCompositionSettings",
  "createProjectFolder",
  "moveProjectItem",
  "addCompositionMarkers",
  "addLayerMarkers",
  "deleteKeyframesInRange",
  "applyEffectStack",
  "importFootage",
  "replaceLayerSource",
  "addToRenderQueue",
  "createLightLayer",
  "createCameraLayer",
  "setTimeRemapKeyframes",
  "validateExpression",
  "createNullLayer",
  "setTrackMatte",
  "renameLayer",
  "applySceneSpec",
  "addMaskToLayer",
  "setMaskProperties",
  "copyEffectsFromLayer",
  "setSourceTextKeyframe",
  "setAudioLevelKeyframes",
  "setKeyframeTemporalEase",
  "snapshotLayerState",
  "createPlaceholderSolid",
  "executeBatch",
  "createComposition",
  "createTextLayer",
  "createShapeLayer",
  "createSolidLayer",
  "setLayerProperties",
  "setLayerKeyframe",
  "setLayerExpression",
  "applyEffect",
  "applyEffectTemplate",
  "test-animation",
  "bridgeTestEffects",
  "setupSceneParallax",
] as const;

/** Preset expression strings for prompts (also available via list-expression-snippets tool). */
export const EXPRESSION_SNIPPETS: Record<string, string> = {
  "wiggle-position-subtle": "wiggle(2, 15)",
  "wiggle-position-medium": "wiggle(3, 30)",
  "wiggle-scale": "wiggle(2, 5)",
  "loop-out-cycle": "loopOut(\"cycle\")",
  "loop-out-offset": "loopOut(\"offset\")",
  "loop-out-continue": "loopOut(\"continue\")",
  "oscillate-opacity": "Math.sin(time * 2 * Math.PI) * 50 + 50",
  "inertial-bounce": "// Inertial bounce — tune freq/decay\nfreq = 2;\ndecay = 4;\nn = 0;\nif (numKeys > 0) {\n  n = nearestKey(time).index;\n  if (key(n).time > time) n--;\n}\nif (n == 0) value;\nelse {\n  t = time - key(n).time;\n  amp = velocityAtTime(key(n).time - 0.001);\n  w = freq * Math.PI * 2;\n  value + amp * Math.sin(t * w) / Math.exp(decay * t);\n}",
  "random-per-second": "random(Math.floor(time * 2))",
  "look-at-camera": "// Parent to a null at comp center; use on 2D/3D as needed\ntarget = thisComp.layer(\"Camera 1\");\nfrom = toWorld(anchorPoint);\nto = target.toWorld(target.anchorPoint);\nvector = normalize(to - from);\nradiansToDegrees(Math.atan2(vector[1], vector[0]))",
};

export const LayerIdentifierSchema = {
  compIndex: z.number().int().positive().describe("1-based index of the target composition in the project panel."),
  layerIndex: z.number().int().positive().describe("1-based index of the target layer within the composition."),
};

export const KeyframeValueSchema = z
  .any()
  .describe(
    "The value for the keyframe (e.g., [x,y] for Position, [w,h] for Scale, angle for Rotation, percentage for Opacity)"
  );

export const EFFECT_TEMPLATE_IDS = [
  "gaussian-blur",
  "directional-blur",
  "color-balance",
  "brightness-contrast",
  "curves",
  "glow",
  "drop-shadow",
  "cinematic-look",
  "text-pop",
] as const;

export const EffectTemplateSchema = z.enum(EFFECT_TEMPLATE_IDS);

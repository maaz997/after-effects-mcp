// mcp-bridge-auto.jsx
// Auto-running MCP Bridge panel for After Effects

// Remove #include directives as we define functions below
/*
#include "createComposition.jsx"
#include "createTextLayer.jsx"
#include "createShapeLayer.jsx"
#include "createSolidLayer.jsx"
#include "setLayerProperties.jsx"
*/

// --- Function Definitions ---

// --- createComposition (from createComposition.jsx) --- 
function createComposition(args) {
    try {
        var name = args.name || "New Composition";
        var width = parseInt(args.width) || 1920;
        var height = parseInt(args.height) || 1080;
        var pixelAspect = parseFloat(args.pixelAspect) || 1.0;
        var duration = parseFloat(args.duration) || 10.0;
        var frameRate = parseFloat(args.frameRate) || 30.0;
        var bgColor = args.backgroundColor ? [args.backgroundColor.r/255, args.backgroundColor.g/255, args.backgroundColor.b/255] : [0, 0, 0];
        var newComp = app.project.items.addComp(name, width, height, pixelAspect, duration, frameRate);
        if (args.backgroundColor) {
            newComp.bgColor = bgColor;
        }
        return JSON.stringify({
            status: "success", message: "Composition created successfully",
            composition: { name: newComp.name, id: newComp.id, width: newComp.width, height: newComp.height, pixelAspect: newComp.pixelAspect, duration: newComp.duration, frameRate: newComp.frameRate, bgColor: newComp.bgColor }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createTextLayer (from createTextLayer.jsx) ---
function createTextLayer(args) {
    try {
        var compName = args.compName || "";
        var text = args.text || "Text Layer";
        var position = args.position || [960, 540]; 
        var fontSize = args.fontSize || 72;
        var color = args.color || [1, 1, 1]; 
        var startTime = args.startTime || 0;
        var duration = args.duration || 5; 
        var fontFamily = args.fontFamily || "Arial";
        var alignment = args.alignment || "center"; 
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; } 
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        var textLayer = comp.layers.addText(text);
        var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
        var textDocument = textProp.value;
        textDocument.fontSize = fontSize;
        textDocument.fillColor = color;
        textDocument.font = fontFamily;
        if (alignment === "left") { textDocument.justification = ParagraphJustification.LEFT_JUSTIFY; } 
        else if (alignment === "center") { textDocument.justification = ParagraphJustification.CENTER_JUSTIFY; } 
        else if (alignment === "right") { textDocument.justification = ParagraphJustification.RIGHT_JUSTIFY; }
        textProp.setValue(textDocument);
        textLayer.property("Position").setValue(position);
        textLayer.startTime = startTime;
        if (duration > 0) { textLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: "Text layer created successfully",
            layer: { name: textLayer.name, index: textLayer.index, type: "text", inPoint: textLayer.inPoint, outPoint: textLayer.outPoint, position: textLayer.property("Position").value }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createShapeLayer (from createShapeLayer.jsx) --- 
function createShapeLayer(args) {
    try {
        var compName = args.compName || "";
        var shapeType = args.shapeType || "rectangle"; 
        var position = args.position || [960, 540]; 
        var size = args.size || [200, 200]; 
        var fillColor = args.fillColor || [1, 0, 0]; 
        var strokeColor = args.strokeColor || [0, 0, 0]; 
        var strokeWidth = args.strokeWidth || 0; 
        var startTime = args.startTime || 0;
        var duration = args.duration || 5; 
        var name = args.name || "Shape Layer";
        var points = args.points || 5; 
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; } 
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = name;
        var contents = shapeLayer.property("Contents"); 
        var shapeGroup = contents.addProperty("ADBE Vector Group");
        var groupContents = shapeGroup.property("Contents"); 
        var shapePathProperty;
        if (shapeType === "rectangle") {
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Rect");
            shapePathProperty.property("Size").setValue(size);
        } else if (shapeType === "ellipse") {
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Ellipse");
            shapePathProperty.property("Size").setValue(size);
        } else if (shapeType === "polygon" || shapeType === "star") { 
            shapePathProperty = groupContents.addProperty("ADBE Vector Shape - Star");
            shapePathProperty.property("Type").setValue(shapeType === "polygon" ? 1 : 2); 
            shapePathProperty.property("Points").setValue(points);
            shapePathProperty.property("Outer Radius").setValue(size[0] / 2);
            if (shapeType === "star") { shapePathProperty.property("Inner Radius").setValue(size[0] / 3); }
        }
        var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("Color").setValue(fillColor);
        fill.property("Opacity").setValue(100);
        if (strokeWidth > 0) {
            var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue(strokeColor);
            stroke.property("Stroke Width").setValue(strokeWidth);
            stroke.property("Opacity").setValue(100);
        }
        shapeLayer.property("Position").setValue(position);
        shapeLayer.startTime = startTime;
        if (duration > 0) { shapeLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: "Shape layer created successfully",
            layer: { name: shapeLayer.name, index: shapeLayer.index, type: "shape", shapeType: shapeType, inPoint: shapeLayer.inPoint, outPoint: shapeLayer.outPoint, position: shapeLayer.property("Position").value }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- createSolidLayer (from createSolidLayer.jsx) --- 
function createSolidLayer(args) {
    try {
        var compName = args.compName || "";
        var color = args.color || [1, 1, 1]; 
        var name = args.name || "Solid Layer";
        var position = args.position || [960, 540]; 
        var size = args.size; 
        var startTime = args.startTime || 0;
        var duration = args.duration || 5; 
        var isAdjustment = args.isAdjustment || false; 
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; } 
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        if (!size) { size = [comp.width, comp.height]; }
        var solidLayer;
        if (isAdjustment) {
            solidLayer = comp.layers.addSolid([0, 0, 0], name, size[0], size[1], 1);
            solidLayer.adjustmentLayer = true;
        } else {
            solidLayer = comp.layers.addSolid(color, name, size[0], size[1], 1);
        }
        solidLayer.property("Position").setValue(position);
        solidLayer.startTime = startTime;
        if (duration > 0) { solidLayer.outPoint = startTime + duration; }
        return JSON.stringify({
            status: "success", message: isAdjustment ? "Adjustment layer created successfully" : "Solid layer created successfully",
            layer: { name: solidLayer.name, index: solidLayer.index, type: isAdjustment ? "adjustment" : "solid", inPoint: solidLayer.inPoint, outPoint: solidLayer.outPoint, position: solidLayer.property("Position").value, isAdjustment: solidLayer.adjustmentLayer }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

// --- setLayerProperties (modified to handle text properties) ---
function setLayerProperties(args) {
    try {
        var compName = args.compName || "";
        var layerName = args.layerName || "";
        var layerIndex = args.layerIndex; 
        
        // General Properties
        var position = args.position; 
        var scale = args.scale; 
        var rotation = args.rotation; 
        var opacity = args.opacity; 
        var startTime = args.startTime; 
        var duration = args.duration; 

        // Text Specific Properties
        var textContent = args.text; // New: text content
        var fontFamily = args.fontFamily; // New: font family
        var fontSize = args.fontSize; // New: font size
        var fillColor = args.fillColor; // New: font color
        
        // Find the composition (same logic as before)
        var comp = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) { comp = item; break; }
        }
        if (!comp) {
            if (app.project.activeItem instanceof CompItem) { comp = app.project.activeItem; } 
            else { throw new Error("No composition found with name '" + compName + "' and no active composition"); }
        }
        
        // Find the layer (same logic as before)
        var layer = null;
        if (layerIndex !== undefined && layerIndex !== null) {
            if (layerIndex > 0 && layerIndex <= comp.numLayers) { layer = comp.layer(layerIndex); } 
            else { throw new Error("Layer index out of bounds: " + layerIndex); }
        } else if (layerName) {
            for (var j = 1; j <= comp.numLayers; j++) {
                if (comp.layer(j).name === layerName) { layer = comp.layer(j); break; }
            }
        }
        if (!layer) { throw new Error("Layer not found: " + (layerName || "index " + layerIndex)); }
        
        var changedProperties = [];
        var textDocumentChanged = false;
        var textProp = null;
        var textDocument = null;

        // --- Text Property Handling ---
        if (layer instanceof TextLayer && (textContent !== undefined || fontFamily !== undefined || fontSize !== undefined || fillColor !== undefined)) {
            var sourceTextProp = layer.property("Source Text");
            if (sourceTextProp && sourceTextProp.value) {
                var currentTextDocument = sourceTextProp.value; // Get the current value
                var updated = false;

                if (textContent !== undefined && textContent !== null && currentTextDocument.text !== textContent) {
                    currentTextDocument.text = textContent;
                    changedProperties.push("text");
                    updated = true;
                }
                if (fontFamily !== undefined && fontFamily !== null && currentTextDocument.font !== fontFamily) {
                    // Add basic validation/logging for font existence if needed
                    // try { app.fonts.findFont(fontFamily); } catch (e) { logToPanel("Warning: Font '"+fontFamily+"' might not be installed."); }
                    currentTextDocument.font = fontFamily;
                    changedProperties.push("fontFamily");
                    updated = true;
                }
                if (fontSize !== undefined && fontSize !== null && currentTextDocument.fontSize !== fontSize) {
                    currentTextDocument.fontSize = fontSize;
                    changedProperties.push("fontSize");
                    updated = true;
                }
                // Comparing colors needs care due to potential floating point inaccuracies if set via UI
                // Simple comparison for now
                if (fillColor !== undefined && fillColor !== null && 
                    (currentTextDocument.fillColor[0] !== fillColor[0] || 
                     currentTextDocument.fillColor[1] !== fillColor[1] || 
                     currentTextDocument.fillColor[2] !== fillColor[2])) {
                    currentTextDocument.fillColor = fillColor;
                    changedProperties.push("fillColor");
                    updated = true;
                }

                // Only set the value if something actually changed
                if (updated) {
                    try {
                        sourceTextProp.setValue(currentTextDocument);
                        logToPanel("Applied changes to Text Document for layer: " + layer.name);
                    } catch (e) {
                        logToPanel("ERROR applying Text Document changes: " + e.toString());
                        // Decide if we should throw or just log the error for text properties
                        // For now, just log, other properties might still succeed
                    }
                }
                 // Store the potentially updated document for the return value
                 textDocument = currentTextDocument; 

            } else {
                logToPanel("Warning: Could not access Source Text property for layer: " + layer.name);
            }
        }

        // --- General Property Handling ---
        if (position !== undefined && position !== null) { layer.property("Position").setValue(position); changedProperties.push("position"); }
        if (scale !== undefined && scale !== null) { layer.property("Scale").setValue(scale); changedProperties.push("scale"); }
        if (rotation !== undefined && rotation !== null) {
            if (layer.threeDLayer) { 
                // For 3D layers, Z rotation is often what's intended by a single value
                layer.property("Z Rotation").setValue(rotation);
            } else { 
                layer.property("Rotation").setValue(rotation); 
            }
            changedProperties.push("rotation");
        }
        if (opacity !== undefined && opacity !== null) { layer.property("Opacity").setValue(opacity); changedProperties.push("opacity"); }
        if (startTime !== undefined && startTime !== null) { layer.startTime = startTime; changedProperties.push("startTime"); }
        if (duration !== undefined && duration !== null && duration > 0) {
            var actualStartTime = (startTime !== undefined && startTime !== null) ? startTime : layer.startTime;
            layer.outPoint = actualStartTime + duration;
            changedProperties.push("duration");
        }

        // Return success with updated layer details (including text if changed)
        var returnLayerInfo = {
            name: layer.name,
            index: layer.index,
            position: layer.property("Position").value,
            scale: layer.property("Scale").value,
            rotation: layer.threeDLayer ? layer.property("Z Rotation").value : layer.property("Rotation").value, // Return appropriate rotation
            opacity: layer.property("Opacity").value,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint,
            changedProperties: changedProperties
        };
        // Add text properties to the return object if it was a text layer
        if (layer instanceof TextLayer && textDocument) {
            returnLayerInfo.text = textDocument.text;
            returnLayerInfo.fontFamily = textDocument.font;
            returnLayerInfo.fontSize = textDocument.fontSize;
            returnLayerInfo.fillColor = textDocument.fillColor;
        }

        // *** ADDED LOGGING HERE ***
        logToPanel("Final check before return:");
        logToPanel("  Changed Properties: " + changedProperties.join(", "));
        logToPanel("  Return Layer Info Font: " + (returnLayerInfo.fontFamily || "N/A")); 
        logToPanel("  TextDocument Font: " + (textDocument ? textDocument.font : "N/A"));

        return JSON.stringify({
            status: "success", message: "Layer properties updated successfully",
            layer: returnLayerInfo
        }, null, 2);
    } catch (error) {
        // Error handling remains similar, but add more specific checks if needed
        return JSON.stringify({ status: "error", message: error.toString() }, null, 2);
    }
}

/**
 * Sets a keyframe for a specific property on a layer.
 * Indices are 1-based for After Effects collections.
 * @param {number} compIndex - The index of the composition (1-based).
 * @param {number} layerIndex - The index of the layer within the composition (1-based).
 * @param {string} propertyName - The name of the property (e.g., "Position", "Scale", "Rotation", "Opacity").
 * @param {number} timeInSeconds - The time (in seconds) for the keyframe.
 * @param {any} value - The value for the keyframe (e.g., [x, y] for Position, [w, h] for Scale, angle for Rotation, percentage for Opacity).
 * @returns {string} JSON string indicating success or error.
 */
function setLayerKeyframe(compIndex, layerIndex, propertyName, timeInSeconds, value) {
    try {
        // Use 1-based indices as per After Effects API
        var comp = app.project.items[compIndex];
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, message: "Composition not found at index " + compIndex });
        }
        var layer = comp.layers[layerIndex];
        if (!layer) {
            return JSON.stringify({ success: false, message: "Layer not found at index " + layerIndex + " in composition '" + comp.name + "'"});
        }

        var transformGroup = layer.property("Transform");
        if (!transformGroup) {
             return JSON.stringify({ success: false, message: "Transform properties not found for layer '" + layer.name + "' (type: " + layer.matchName + ")." });
        }

        var property = transformGroup.property(propertyName);
        if (!property) {
            // Check other common property groups if not in Transform
             if (layer.property("Effects") && layer.property("Effects").property(propertyName)) {
                 property = layer.property("Effects").property(propertyName);
             } else if (layer.property("Text") && layer.property("Text").property(propertyName)) {
                 property = layer.property("Text").property(propertyName);
            } // Add more groups if needed (e.g., Masks, Shapes)

            if (!property) {
                 return JSON.stringify({ success: false, message: "Property '" + propertyName + "' not found on layer '" + layer.name + "'." });
            }
        }


        // Ensure the property can be keyframed
        if (!property.canVaryOverTime) {
             return JSON.stringify({ success: false, message: "Property '" + propertyName + "' cannot be keyframed." });
        }

        // Make sure the property is enabled for keyframing
        if (property.numKeys === 0 && !property.isTimeVarying) {
             property.setValueAtTime(comp.time, property.value); // Set initial keyframe if none exist
        }


        property.setValueAtTime(timeInSeconds, value);

        return JSON.stringify({ success: true, message: "Keyframe set for '" + propertyName + "' on layer '" + layer.name + "' at " + timeInSeconds + "s." });
    } catch (e) {
        return JSON.stringify({ success: false, message: "Error setting keyframe: " + e.toString() + " (Line: " + e.line + ")" });
    }
}


/**
 * Sets an expression for a specific property on a layer.
 * @param {number} compIndex - The index of the composition (1-based).
 * @param {number} layerIndex - The index of the layer within the composition (1-based).
 * @param {string} propertyName - The name of the property (e.g., "Position", "Scale", "Rotation", "Opacity").
 * @param {string} expressionString - The JavaScript expression string. Use "" to remove expression.
 * @returns {string} JSON string indicating success or error.
 */
function setLayerExpression(compIndex, layerIndex, propertyName, expressionString) {
    try {
         // Adjust indices to be 0-based for ExtendScript arrays
        var comp = app.project.items[compIndex];
         if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, message: "Composition not found at index " + compIndex });
        }
        var layer = comp.layers[layerIndex];
         if (!layer) {
            return JSON.stringify({ success: false, message: "Layer not found at index " + layerIndex + " in composition '" + comp.name + "'"});
        }

        var transformGroup = layer.property("Transform");
         if (!transformGroup) {
             // Allow expressions on non-transformable layers if property exists elsewhere
             // return JSON.stringify({ success: false, message: "Transform properties not found for layer '" + layer.name + "' (type: " + layer.matchName + ")." });
        }

        var property = transformGroup ? transformGroup.property(propertyName) : null;
         if (!property) {
            // Check other common property groups if not in Transform
             if (layer.property("Effects") && layer.property("Effects").property(propertyName)) {
                 property = layer.property("Effects").property(propertyName);
             } else if (layer.property("Text") && layer.property("Text").property(propertyName)) {
                 property = layer.property("Text").property(propertyName);
             } // Add more groups if needed

            if (!property) {
                 return JSON.stringify({ success: false, message: "Property '" + propertyName + "' not found on layer '" + layer.name + "'." });
            }
        }

        if (!property.canSetExpression) {
            return JSON.stringify({ success: false, message: "Property '" + propertyName + "' does not support expressions." });
        }

        property.expression = expressionString;

        var action = expressionString === "" ? "removed" : "set";
        return JSON.stringify({ success: true, message: "Expression " + action + " for '" + propertyName + "' on layer '" + layer.name + "'." });
    } catch (e) {
        return JSON.stringify({ success: false, message: "Error setting expression: " + e.toString() + " (Line: " + e.line + ")" });
    }
}

// --- applyEffect (from applyEffect.jsx) ---
function applyEffect(args) {
    try {
        // Extract parameters
        var compIndex = args.compIndex || 1; // Default to first comp
        var layerIndex = args.layerIndex || 1; // Default to first layer
        var effectName = args.effectName; // Name of the effect to apply
        var effectMatchName = args.effectMatchName; // After Effects internal name (more reliable)
        var effectCategory = args.effectCategory || ""; // Optional category for filtering
        var presetPath = args.presetPath; // Optional path to an effect preset
        var effectSettings = args.effectSettings || {}; // Optional effect parameters
        
        if (!effectName && !effectMatchName && !presetPath) {
            throw new Error("You must specify either effectName, effectMatchName, or presetPath");
        }
        
        // Find the composition by index
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Composition not found at index " + compIndex);
        }
        
        // Find the layer by index
        var layer = comp.layer(layerIndex);
        if (!layer) {
            throw new Error("Layer not found at index " + layerIndex + " in composition '" + comp.name + "'");
        }
        
        var effectResult;
        
        // Apply preset if a path is provided
        if (presetPath) {
            var presetFile = new File(presetPath);
            if (!presetFile.exists) {
                throw new Error("Effect preset file not found: " + presetPath);
            }
            
            // Apply the preset to the layer
            layer.applyPreset(presetFile);
            effectResult = {
                type: "preset",
                name: presetPath.split('/').pop().split('\\').pop(),
                applied: true
            };
        }
        // Apply effect by match name (more reliable method)
        else if (effectMatchName) {
            var effect = layer.Effects.addProperty(effectMatchName);
            effectResult = {
                type: "effect",
                name: effect.name,
                matchName: effect.matchName,
                index: effect.propertyIndex
            };
            
            // Apply settings if provided
            applyEffectSettings(effect, effectSettings);
        }
        // Apply effect by display name
        else {
            // Get the effect from the Effect menu
            var effect = layer.Effects.addProperty(effectName);
            effectResult = {
                type: "effect",
                name: effect.name,
                matchName: effect.matchName,
                index: effect.propertyIndex
            };
            
            // Apply settings if provided
            applyEffectSettings(effect, effectSettings);
        }
        
        return JSON.stringify({
            status: "success",
            message: "Effect applied successfully",
            effect: effectResult,
            layer: {
                name: layer.name,
                index: layerIndex
            },
            composition: {
                name: comp.name,
                index: compIndex
            }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({
            status: "error",
            message: error.toString()
        }, null, 2);
    }
}

// Helper function to apply effect settings
function applyEffectSettings(effect, settings) {
    // Skip if no settings are provided
    if (!settings || Object.keys(settings).length === 0) {
        return;
    }
    
    // Iterate through all provided settings
    for (var propName in settings) {
        if (settings.hasOwnProperty(propName)) {
            try {
                // Find the property in the effect
                var property = null;
                
                // Try direct property access first
                try {
                    property = effect.property(propName);
                } catch (e) {
                    // If direct access fails, search through all properties
                    for (var i = 1; i <= effect.numProperties; i++) {
                        var prop = effect.property(i);
                        if (prop.name === propName) {
                            property = prop;
                            break;
                        }
                    }
                }
                
                // Set the property value if found
                if (property && property.setValue) {
                    property.setValue(settings[propName]);
                }
            } catch (e) {
                // Log error but continue with other properties
                $.writeln("Error setting effect property '" + propName + "': " + e.toString());
            }
        }
    }
}

// --- applyEffectTemplate (from applyEffectTemplate.jsx) ---
function applyEffectTemplate(args) {
    try {
        // Extract parameters
        var compIndex = args.compIndex || 1; // Default to first comp
        var layerIndex = args.layerIndex || 1; // Default to first layer
        var templateName = args.templateName; // Name of the template to apply
        var customSettings = args.customSettings || {}; // Optional customizations
        
        if (!templateName) {
            throw new Error("You must specify a templateName");
        }
        
        // Find the composition by index
        var comp = app.project.item(compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Composition not found at index " + compIndex);
        }
        
        // Find the layer by index
        var layer = comp.layer(layerIndex);
        if (!layer) {
            throw new Error("Layer not found at index " + layerIndex + " in composition '" + comp.name + "'");
        }
        
        // Template definitions
        var templates = {
            // Blur effects
            "gaussian-blur": {
                effectMatchName: "ADBE Gaussian Blur 2",
                settings: {
                    "Blurriness": customSettings.blurriness || 20
                }
            },
            "directional-blur": {
                effectMatchName: "ADBE Directional Blur",
                settings: {
                    "Direction": customSettings.direction || 0,
                    "Blur Length": customSettings.length || 10
                }
            },
            
            // Color correction effects
            "color-balance": {
                effectMatchName: "ADBE Color Balance (HLS)",
                settings: {
                    "Hue": customSettings.hue || 0,
                    "Lightness": customSettings.lightness || 0,
                    "Saturation": customSettings.saturation || 0
                }
            },
            "brightness-contrast": {
                effectMatchName: "ADBE Brightness & Contrast 2",
                settings: {
                    "Brightness": customSettings.brightness || 0,
                    "Contrast": customSettings.contrast || 0,
                    "Use Legacy": false
                }
            },
            "curves": {
                effectMatchName: "ADBE CurvesCustom",
                // Curves are complex and would need special handling
            },
            
            // Stylistic effects
            "glow": {
                effectMatchName: "ADBE Glow",
                settings: {
                    "Glow Threshold": customSettings.threshold || 50,
                    "Glow Radius": customSettings.radius || 15,
                    "Glow Intensity": customSettings.intensity || 1
                }
            },
            "drop-shadow": {
                effectMatchName: "ADBE Drop Shadow",
                settings: {
                    "Shadow Color": customSettings.color || [0, 0, 0, 1],
                    "Opacity": customSettings.opacity || 50,
                    "Direction": customSettings.direction || 135,
                    "Distance": customSettings.distance || 10,
                    "Softness": customSettings.softness || 10
                }
            },
            
            // Common effect chains
            "cinematic-look": {
                effects: [
                    {
                        effectMatchName: "ADBE CurvesCustom",
                        settings: {}
                    },
                    {
                        effectMatchName: "ADBE Vibrance",
                        settings: {
                            "Vibrance": 15,
                            "Saturation": -5
                        }
                    }
                ]
            },
            "text-pop": {
                effects: [
                    {
                        effectMatchName: "ADBE Drop Shadow",
                        settings: {
                            "Shadow Color": [0, 0, 0, 1],
                            "Opacity": 75,
                            "Distance": 5,
                            "Softness": 10
                        }
                    },
                    {
                        effectMatchName: "ADBE Glow",
                        settings: {
                            "Glow Threshold": 50,
                            "Glow Radius": 10,
                            "Glow Intensity": 1.5
                        }
                    }
                ]
            }
        };
        
        // Check if the requested template exists
        var template = templates[templateName];
        if (!template) {
            var availableTemplates = Object.keys(templates).join(", ");
            throw new Error("Template '" + templateName + "' not found. Available templates: " + availableTemplates);
        }
        
        var appliedEffects = [];
        
        // Apply single effect or multiple effects based on template structure
        if (template.effectMatchName) {
            // Single effect template
            var effect = layer.Effects.addProperty(template.effectMatchName);
            
            // Apply settings
            for (var propName in template.settings) {
                try {
                    var property = effect.property(propName);
                    if (property) {
                        property.setValue(template.settings[propName]);
                    }
                } catch (e) {
                    $.writeln("Warning: Could not set " + propName + " on effect " + effect.name + ": " + e);
                }
            }
            
            appliedEffects.push({
                name: effect.name,
                matchName: effect.matchName
            });
        } else if (template.effects) {
            // Multiple effects template
            for (var i = 0; i < template.effects.length; i++) {
                var effectData = template.effects[i];
                var effect = layer.Effects.addProperty(effectData.effectMatchName);
                
                // Apply settings
                for (var propName in effectData.settings) {
                    try {
                        var property = effect.property(propName);
                        if (property) {
                            property.setValue(effectData.settings[propName]);
                        }
                    } catch (e) {
                        $.writeln("Warning: Could not set " + propName + " on effect " + effect.name + ": " + e);
                    }
                }
                
                appliedEffects.push({
                    name: effect.name,
                    matchName: effect.matchName
                });
            }
        }
        
        return JSON.stringify({
            status: "success",
            message: "Effect template '" + templateName + "' applied successfully",
            appliedEffects: appliedEffects,
            layer: {
                name: layer.name,
                index: layerIndex
            },
            composition: {
                name: comp.name,
                index: compIndex
            }
        }, null, 2);
    } catch (error) {
        return JSON.stringify({
            status: "error",
            message: error.toString()
        }, null, 2);
    }
}

/**
 * Modifies one composition: duplicate the top non-camera image layer into FG/MID/BOY parallax stack,
 * 3D + camera push + wiggle (by name: scene_01 or args.compName). Does not import assets or create comps.
 */
function setupSceneParallax(args) {
    try {
        args = args || {};
        var compName = args.compName || "scene_01";
        var durationSec = parseFloat(args.durationSeconds);
        if (isNaN(durationSec) || durationSec <= 0) {
            durationSec = 12;
        }
        var pushEnd = parseFloat(args.cameraPushEndSeconds);
        if (isNaN(pushEnd) || pushEnd <= 0) {
            pushEnd = 10;
        }

        var comp = null;
        for (var pi = 1; pi <= app.project.numItems; pi++) {
            var it = app.project.item(pi);
            if (it instanceof CompItem && it.name === compName) {
                comp = it;
                break;
            }
        }
        if (!comp) {
            return JSON.stringify({
                status: "error",
                message: "Composition not found: '" + compName + "'",
            }, null, 2);
        }

        app.beginUndoGroup("MCP setupSceneParallax");

        // Remove existing main camera so re-runs don't stack cameras
        for (var ri = comp.numLayers; ri >= 1; ri--) {
            var rl = comp.layer(ri);
            if (rl instanceof CameraLayer && rl.name === "Main_Camera") {
                rl.remove();
            }
        }

        var cx = comp.width / 2;
        var cy = comp.height / 2;

        var fg = null;
        var mid = null;
        var bg = null;

        if (comp.numLayers === 3 &&
            comp.layer(1).name === "FG" &&
            comp.layer(2).name === "MID_BOY" &&
            comp.layer(3).name === "BG") {
            fg = comp.layer(1);
            mid = comp.layer(2);
            bg = comp.layer(3);
        } else if (comp.numLayers === 1) {
            var base = comp.layer(1);
            if (base instanceof CameraLayer) {
                throw new Error("First layer is a camera; expected a single image/footage layer.");
            }
            base.duplicate();
            base.duplicate();
            comp.layer(1).name = "FG";
            comp.layer(2).name = "MID_BOY";
            comp.layer(3).name = "BG";
            fg = comp.layer(1);
            mid = comp.layer(2);
            bg = comp.layer(3);
        } else {
            throw new Error(
                "Expected comp '" + compName + "' to have either 1 non-camera layer (to duplicate) or existing FG/MID_BOY/BG stack (3 layers). Currently numLayers=" + comp.numLayers
            );
        }

        comp.duration = durationSec;

        fg.threeDLayer = true;
        mid.threeDLayer = true;
        bg.threeDLayer = true;

        var posFg = fg.property("Position");
        var posMid = mid.property("Position");
        var posBg = bg.property("Position");
        posFg.expression = "";
        posMid.expression = "";
        posBg.expression = "";

        posFg.setValue([cx, cy, 200]);
        posMid.setValue([cx, cy, 0]);
        posBg.setValue([cx, cy, -500]);

        fg.property("Scale").setValue([110, 110, 100]);
        mid.property("Scale").setValue([100, 100, 100]);
        bg.property("Scale").setValue([105, 105, 100]);

        fg.property("Opacity").setValue(65);

        mid.property("Position").expression = "wiggle(0.3, 5)";
        bg.property("Position").expression = "wiggle(0.1, 10)";

        var cam = comp.layers.addCamera("Main_Camera", [cx, cy]);
        var camOpts = cam.property("Camera Options");
        if (camOpts && camOpts.property("Zoom")) {
            camOpts.property("Zoom").setValue(861.12);
        }

        var camPos = cam.property("Position");
        while (camPos.numKeys > 0) {
            camPos.removeKey(camPos.numKeys);
        }
        camPos.setValueAtTime(0, [0, 0, -1000]);
        camPos.setValueAtTime(pushEnd, [0, 0, -600]);

        var tEnd = comp.duration;
        for (var li = 1; li <= comp.numLayers; li++) {
            var L = comp.layer(li);
            L.startTime = 0;
            L.inPoint = 0;
            L.outPoint = tEnd;
        }

        app.endUndoGroup();

        return JSON.stringify({
            status: "success",
            message: "setupSceneParallax completed",
            composition: comp.name,
            duration: comp.duration,
            cameraPushEnd: pushEnd,
            layers: {
                FG: { name: fg.name, index: fg.index },
                MID_BOY: { name: mid.name, index: mid.index },
                BG: { name: bg.name, index: bg.index },
                Main_Camera: { name: cam.name, index: cam.index },
            },
        }, null, 2);
    } catch (e) {
        try {
            app.endUndoGroup();
        } catch (ignore) {}
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

// --- End of Function Definitions ---

// --- Bridge test function to verify communication and effects application ---
function bridgeTestEffects(args) {
    try {
        var compIndex = (args && args.compIndex) ? args.compIndex : 1;
        var layerIndex = (args && args.layerIndex) ? args.layerIndex : 1;

        // Apply a light Gaussian Blur
        var blurRes = JSON.parse(applyEffect({
            compIndex: compIndex,
            layerIndex: layerIndex,
            effectMatchName: "ADBE Gaussian Blur 2",
            effectSettings: { "Blurriness": 5 }
        }));

        // Apply a simple drop shadow via template
        var shadowRes = JSON.parse(applyEffectTemplate({
            compIndex: compIndex,
            layerIndex: layerIndex,
            templateName: "drop-shadow"
        }));

        return JSON.stringify({
            status: "success",
            message: "Bridge test effects applied.",
            results: [blurRes, shadowRes]
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

// JSON polyfill for ExtendScript (when JSON is undefined)
if (typeof JSON === "undefined") {
    JSON = {};
}
if (typeof JSON.parse !== "function") {
    JSON.parse = function (text) {
        // Safe-ish fallback for trusted input (our own command file)
        return eval("(" + text + ")");
    };
}
if (typeof JSON.stringify !== "function") {
    (function () {
        function esc(str) {
            return (str + "")
                .replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"')
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "\\r")
                .replace(/\t/g, "\\t");
        }
        function toJSON(val) {
            if (val === null) return "null";
            var t = typeof val;
            if (t === "number" || t === "boolean") return String(val);
            if (t === "string") return '"' + esc(val) + '"';
            if (val instanceof Array) {
                var a = [];
                for (var i = 0; i < val.length; i++) a.push(toJSON(val[i]));
                return "[" + a.join(",") + "]";
            }
            if (t === "object") {
                var props = [];
                for (var k in val) {
                    if (val.hasOwnProperty(k) && typeof val[k] !== "function" && typeof val[k] !== "undefined") {
                        props.push('"' + esc(k) + '":' + toJSON(val[k]));
                    }
                }
                return "{" + props.join(",") + "}";
            }
            return "null";
        }
        JSON.stringify = function (value, _replacer, _space) {
            return toJSON(value);
        };
    })();
}

// Detect AE version (e.g. AE 2025 = 25.x, AE 2026 = 26.x — app.version string from host)
var aeVersion = parseFloat(app.version);
var isAE2025OrLater = aeVersion >= 25.0;

// Always create a floating palette window for AE 25+ (dockable ScriptUI panels not supported)
var panel = new Window("palette", "MCP Bridge Auto", undefined);
panel.orientation = "column";
panel.alignChildren = ["fill", "top"];
panel.spacing = 10;
panel.margins = 16;

// Status display
var statusText = panel.add("statictext", undefined, "Waiting for commands...");
statusText.alignment = ["fill", "top"];

// Add log area
var logPanel = panel.add("panel", undefined, "Command Log");
logPanel.orientation = "column";
logPanel.alignChildren = ["fill", "fill"];
var logText = logPanel.add("edittext", undefined, "", {multiline: true, readonly: true});
logText.preferredSize.height = 200;

// AE 25+ (2025 / 2026 / 26.x): floating panel only
if (isAE2025OrLater) {
    var warning = panel.add("statictext", undefined, "AE 25+ (incl. 2026 / v26): Dockable panels are not supported. Use this floating window.");
    warning.graphics.foregroundColor = warning.graphics.newPen(warning.graphics.PenType.SOLID_COLOR, [1,0.3,0,1], 1);
}

// Auto-run checkbox
var autoRunCheckbox = panel.add("checkbox", undefined, "Auto-run commands");
autoRunCheckbox.value = true;

// Check interval (ms)
var checkInterval = 2000;
var isChecking = false;

// Command file path - use Documents folder for reliable access
function getCommandFilePath() {
    var userFolder = Folder.myDocuments;
    var bridgeFolder = new Folder(userFolder.fsName + "/ae-mcp-bridge");
    if (!bridgeFolder.exists) {
        bridgeFolder.create();
    }
    return bridgeFolder.fsName + "/ae_command.json";
}

// Result file path - use Documents folder for reliable access
function getResultFilePath() {
    var userFolder = Folder.myDocuments;
    var bridgeFolder = new Folder(userFolder.fsName + "/ae-mcp-bridge");
    if (!bridgeFolder.exists) {
        bridgeFolder.create();
    }
    return bridgeFolder.fsName + "/ae_mcp_result.json";
}

// Functions for each script type
function getProjectInfo() {
    var project = app.project;
    var result = {
        projectName: project.file ? project.file.name : "Untitled Project",
        path: project.file ? project.file.fsName : "",
        numItems: project.numItems,
        bitsPerChannel: project.bitsPerChannel,
        timeMode: project.timeDisplayType === TimeDisplayType.FRAMES ? "Frames" : "Timecode",
        items: []
    };

    // Count item types
    var countByType = {
        compositions: 0,
        footage: 0,
        folders: 0,
        solids: 0
    };

    // Get item information (limited for performance)
    for (var i = 1; i <= Math.min(project.numItems, 50); i++) {
        var item = project.item(i);
        var itemType = "";
        
        if (item instanceof CompItem) {
            itemType = "Composition";
            countByType.compositions++;
        } else if (item instanceof FolderItem) {
            itemType = "Folder";
            countByType.folders++;
        } else if (item instanceof FootageItem) {
            if (item.mainSource instanceof SolidSource) {
                itemType = "Solid";
                countByType.solids++;
            } else {
                itemType = "Footage";
                countByType.footage++;
            }
        }
        
        result.items.push({
            id: item.id,
            name: item.name,
            type: itemType
        });
    }
    
    result.itemCounts = countByType;

    // Include active composition metadata if available
    if (app.project.activeItem instanceof CompItem) {
        var ac = app.project.activeItem;
        result.activeComp = {
            id: ac.id,
            name: ac.name,
            width: ac.width,
            height: ac.height,
            duration: ac.duration,
            frameRate: ac.frameRate,
            numLayers: ac.numLayers
        };
    }

    return JSON.stringify(result, null, 2);
}

function listCompositions() {
    var project = app.project;
    var result = {
        compositions: []
    };
    
    // Loop through items in the project
    for (var i = 1; i <= project.numItems; i++) {
        var item = project.item(i);
        
        // Check if the item is a composition
        if (item instanceof CompItem) {
            result.compositions.push({
                id: item.id,
                name: item.name,
                duration: item.duration,
                frameRate: item.frameRate,
                width: item.width,
                height: item.height,
                numLayers: item.numLayers
            });
        }
    }
    
    return JSON.stringify(result, null, 2);
}

function getLayerInfo() {
    var project = app.project;
    var result = {
        layers: []
    };
    
    // Get the active composition
    var activeComp = null;
    if (app.project.activeItem instanceof CompItem) {
        activeComp = app.project.activeItem;
    } else {
        return JSON.stringify({ error: "No active composition" }, null, 2);
    }
    
    // Loop through layers in the active composition
    for (var i = 1; i <= activeComp.numLayers; i++) {
        var layer = activeComp.layer(i);
        var layerInfo = {
            index: layer.index,
            name: layer.name,
            enabled: layer.enabled,
            locked: layer.locked,
            inPoint: layer.inPoint,
            outPoint: layer.outPoint
        };
        
        result.layers.push(layerInfo);
    }
    
    return JSON.stringify(result, null, 2);
}

// --- MCP extended API helpers (comp by name or project item index) ---
function mcpFindComp(args) {
    var comp = null;
    if (args && args.compName && String(args.compName).length) {
        var cn = String(args.compName);
        for (var i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem && it.name === cn) {
                comp = it;
                break;
            }
        }
    }
    if (!comp && args && args.compIndex !== undefined && args.compIndex !== null) {
        var ci = parseInt(args.compIndex, 10);
        if (!isNaN(ci) && ci > 0) {
            var it2 = app.project.item(ci);
            if (it2 instanceof CompItem) {
                comp = it2;
            }
        }
    }
    if (!comp && app.project.activeItem instanceof CompItem) {
        comp = app.project.activeItem;
    }
    return comp;
}

function mcpLayerKind(layer) {
    if (layer instanceof CameraLayer) {
        return "camera";
    }
    if (layer instanceof LightLayer) {
        return "light";
    }
    if (layer instanceof TextLayer) {
        return "text";
    }
    if (layer instanceof ShapeLayer) {
        return "shape";
    }
    if (layer.nullLayer) {
        return "null";
    }
    if (layer.adjustmentLayer) {
        return "adjustment";
    }
    return "av";
}

function getBridgeCapabilities(args) {
    return JSON.stringify({
        status: "success",
        bridgeApiVersion: "2.0",
        appVersion: app.version,
        appName: app.name,
        language: app.isoLanguage,
        optimizedForAeRelease: "2026 (26.x)",
        scriptingEngine: "ExtendScript"
    }, null, 2);
}

function listLayersDetailed(args) {
    try {
        var comp = mcpFindComp(args || {});
        if (!comp) {
            throw new Error("Composition not found (compName, compIndex, or active comp)");
        }
        var layers = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var L = comp.layer(i);
            var pid = null;
            try {
                if (L.parent) {
                    pid = L.parent.index;
                }
            } catch (pe) {}
            layers.push({
                index: L.index,
                name: L.name,
                matchName: L.matchName,
                kind: mcpLayerKind(L),
                threeDLayer: L.threeDLayer,
                parentIndex: pid,
                enabled: L.enabled,
                locked: L.locked,
                shy: L.shy,
                inPoint: L.inPoint,
                outPoint: L.outPoint,
                startTime: L.startTime
            });
        }
        return JSON.stringify({
            status: "success",
            composition: comp.name,
            itemId: comp.id,
            numLayers: comp.numLayers,
            layers: layers
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function getCompositionDetails(args) {
    try {
        var comp = mcpFindComp(args || {});
        if (!comp) {
            throw new Error("Composition not found");
        }
        return JSON.stringify({
            status: "success",
            composition: {
                id: comp.id,
                name: comp.name,
                width: comp.width,
                height: comp.height,
                duration: comp.duration,
                frameRate: comp.frameRate,
                pixelAspect: comp.pixelAspect,
                numLayers: comp.numLayers,
                workAreaStart: comp.workAreaStart,
                workAreaDuration: comp.workAreaDuration,
                dropFrame: comp.dropFrame,
                displayStartTime: comp.displayStartTime,
                resolutionFactor: comp.resolutionFactor,
                motionBlur: comp.motionBlur,
                bgColor: comp.bgColor
            }
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function listProjectItems(args) {
    try {
        var maxItems = args && args.maxItems ? parseInt(args.maxItems, 10) : 200;
        var items = [];
        for (var i = 1; i <= app.project.numItems && i <= maxItems; i++) {
            var it = app.project.item(i);
            var t = "other";
            if (it instanceof CompItem) {
                t = "comp";
            } else if (it instanceof FolderItem) {
                t = "folder";
            } else if (it instanceof FootageItem) {
                t = it.mainSource instanceof SolidSource ? "solid" : "footage";
            }
            items.push({ id: it.id, name: it.name, type: t, index: i });
        }
        return JSON.stringify({ status: "success", numItems: app.project.numItems, items: items }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function listTransformPropertyNames(args) {
    return JSON.stringify({
        status: "success",
        names: ["Anchor Point", "Position", "Scale", "Rotation", "Opacity", "Z Rotation", "X Rotation", "Y Rotation"]
    }, null, 2);
}

function samplePropertyAtTime(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        if (!layer) {
            throw new Error("Invalid layerIndex");
        }
        var t = parseFloat(args.timeInSeconds);
        if (isNaN(t)) {
            t = 0;
        }
        var propName = args.propertyName || "Position";
        var tg = layer.property("Transform");
        if (!tg) {
            throw new Error("No transform");
        }
        var prop = tg.property(propName);
        if (!prop) {
            throw new Error("Property not found: " + propName);
        }
        var val = prop.valueAtTime(t, false);
        return JSON.stringify({ status: "success", value: val, time: t, propertyName: propName }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function getPropertyKeyframeTimes(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        var propName = args.propertyName || "Position";
        var tg = layer.property("Transform");
        var prop = tg.property(propName);
        var times = [];
        for (var k = 1; k <= prop.numKeys; k++) {
            times.push(prop.keyTime(k));
        }
        return JSON.stringify({ status: "success", keyTimes: times, numKeys: prop.numKeys }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function duplicateLayer(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var li = parseInt(args.layerIndex, 10);
        var count = parseInt(args.count, 10);
        if (isNaN(count) || count < 1) {
            count = 1;
        }
        if (count > 30) {
            throw new Error("count must be <= 30");
        }
        var layer = comp.layer(li);
        if (!layer) {
            throw new Error("Layer not found");
        }
        var created = [];
        for (var d = 0; d < count; d++) {
            var nl = layer.duplicate();
            created.push({ index: nl.index, name: nl.name });
        }
        return JSON.stringify({ status: "success", duplicated: created }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setLayerParent(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var child = comp.layer(args.layerIndex);
        if (!child) {
            throw new Error("Child layer not found");
        }
        var pi = args.parentLayerIndex;
        if (pi === null || pi === undefined || pi === "" || pi === 0) {
            child.parent = null;
        } else {
            var par = comp.layer(parseInt(pi, 10));
            if (!par) {
                throw new Error("Parent layer not found");
            }
            child.parent = par;
        }
        return JSON.stringify({
            status: "success",
            childIndex: child.index,
            parentIndex: child.parent ? child.parent.index : null
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function moveLayerToIndex(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var layer = comp.layer(args.layerIndex);
        if (!layer) {
            throw new Error("Layer not found");
        }
        var newIndex = parseInt(args.newIndex, 10);
        if (isNaN(newIndex) || newIndex < 1 || newIndex > comp.numLayers) {
            throw new Error("Invalid newIndex");
        }
        layer.moveBefore(comp.layer(newIndex));
        return JSON.stringify({ status: "success", index: layer.index }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setLayerBlendMode(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var layer = comp.layer(args.layerIndex);
        if (!layer) {
            throw new Error("Layer not found");
        }
        var bm = args.blendMode;
        if (typeof bm === "string" && BlendingMode[bm] !== undefined) {
            layer.blendingMode = BlendingMode[bm];
        } else {
            layer.blendingMode = parseInt(bm, 10);
        }
        return JSON.stringify({ status: "success", blendMode: layer.blendingMode }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function splitLayerAtTime(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var layer = comp.layer(args.layerIndex);
        if (!layer) {
            throw new Error("Layer not found");
        }
        var t = parseFloat(args.timeInSeconds);
        layer.splitLayer(t);
        return JSON.stringify({ status: "success", message: "split at " + t }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function precomposeLayers(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var indices = args.layerIndices;
        if (!indices || !(indices instanceof Array) || indices.length < 1) {
            throw new Error("layerIndices array required");
        }
        var name = args.newCompName || "MCP Precomp";
        var moveAttr = args.moveAllAttributes !== false;
        var newComp = comp.layers.precompose(indices, name, moveAttr);
        return JSON.stringify({
            status: "success",
            newCompName: newComp.name,
            newCompId: newComp.id,
            width: newComp.width,
            height: newComp.height
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setCompositionSettings(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        if (args.duration !== undefined && args.duration !== null) {
            comp.duration = parseFloat(args.duration);
        }
        if (args.frameRate !== undefined && args.frameRate !== null) {
            comp.frameRate = parseFloat(args.frameRate);
        }
        if (args.width !== undefined && args.width !== null) {
            comp.width = parseInt(args.width, 10);
        }
        if (args.height !== undefined && args.height !== null) {
            comp.height = parseInt(args.height, 10);
        }
        if (args.pixelAspect !== undefined && args.pixelAspect !== null) {
            comp.pixelAspect = parseFloat(args.pixelAspect);
        }
        if (args.workAreaStart !== undefined && args.workAreaStart !== null) {
            comp.workAreaStart = parseFloat(args.workAreaStart);
        }
        if (args.workAreaDuration !== undefined && args.workAreaDuration !== null) {
            comp.workAreaDuration = parseFloat(args.workAreaDuration);
        }
        return JSON.stringify({ status: "success", name: comp.name }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function createProjectFolder(args) {
    try {
        var name = args.name || "New Folder";
        var folder = app.project.items.addFolder(name);
        if (args.parentFolderId) {
            var pid = parseInt(args.parentFolderId, 10);
            for (var i = 1; i <= app.project.numItems; i++) {
                var it = app.project.item(i);
                if (it instanceof FolderItem && it.id === pid) {
                    folder.parentFolder = it;
                    break;
                }
            }
        }
        return JSON.stringify({ status: "success", folderId: folder.id, name: folder.name }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function moveProjectItem(args) {
    try {
        var itemId = parseInt(args.itemId, 10);
        var item = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i).id === itemId) {
                item = app.project.item(i);
                break;
            }
        }
        if (!item) {
            throw new Error("Item not found");
        }
        if (args.targetFolderId === null || args.targetFolderId === undefined || args.targetFolderId === "") {
            item.parentFolder = null;
        } else {
            var tf = parseInt(args.targetFolderId, 10);
            var folder = null;
            for (var j = 1; j <= app.project.numItems; j++) {
                var it = app.project.item(j);
                if (it instanceof FolderItem && it.id === tf) {
                    folder = it;
                    break;
                }
            }
            if (!folder) {
                throw new Error("Target folder not found");
            }
            item.parentFolder = folder;
        }
        return JSON.stringify({ status: "success" }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function addCompositionMarkers(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var markers = args.markers || [];
        for (var i = 0; i < markers.length; i++) {
            var m = markers[i];
            var mv = new MarkerValue(m.comment || "");
            if (m.duration !== undefined && m.duration !== null) {
                mv.duration = parseFloat(m.duration);
            }
            comp.markerProperty.setValueAtTime(parseFloat(m.time), mv);
        }
        return JSON.stringify({ status: "success", count: markers.length }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function addLayerMarkers(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var layer = comp.layer(args.layerIndex);
        if (!layer) {
            throw new Error("Layer not found");
        }
        var markers = args.markers || [];
        for (var i = 0; i < markers.length; i++) {
            var m = markers[i];
            var mv = new MarkerValue(m.comment || "");
            if (m.duration !== undefined && m.duration !== null) {
                mv.duration = parseFloat(m.duration);
            }
            layer.markerProperty.setValueAtTime(parseFloat(m.time), mv);
        }
        return JSON.stringify({ status: "success", count: markers.length }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function deleteKeyframesInRange(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        var propName = args.propertyName || "Position";
        var prop = layer.property("Transform").property(propName);
        var t0 = parseFloat(args.startTime);
        var t1 = parseFloat(args.endTime);
        for (var k = prop.numKeys; k >= 1; k--) {
            var kt = prop.keyTime(k);
            if (kt >= t0 && kt <= t1) {
                prop.removeKey(k);
            }
        }
        return JSON.stringify({ status: "success" }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function applyEffectStack(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        var stack = args.effects;
        if (!stack || !(stack instanceof Array)) {
            throw new Error("effects array required");
        }
        var applied = [];
        for (var i = 0; i < stack.length; i++) {
            var eff = stack[i];
            var mn = eff.effectMatchName || eff.matchName;
            if (!mn) {
                throw new Error("effectMatchName required for item " + i);
            }
            var effect = layer.Effects.addProperty(mn);
            applyEffectSettings(effect, eff.effectSettings || eff.settings || {});
            applied.push({ name: effect.name, matchName: effect.matchName });
        }
        return JSON.stringify({ status: "success", applied: applied }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function importFootage(args) {
    try {
        var path = args.filePath;
        if (!path) {
            throw new Error("filePath required");
        }
        var f = new File(path);
        if (!f.exists) {
            throw new Error("File not found: " + path);
        }
        var io = new ImportOptions(f);
        var item = app.project.importFile(io);
        return JSON.stringify({
            status: "success",
            id: item.id,
            name: item.name,
            typeName: item.typeName
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function replaceLayerSource(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        var fid = parseInt(args.footageItemId, 10);
        var footageItem = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i).id === fid) {
                footageItem = app.project.item(i);
                break;
            }
        }
        if (!footageItem || !(footageItem instanceof FootageItem)) {
            throw new Error("Footage item not found");
        }
        var fixExp = args.fixExpressions === true;
        layer.replaceSource(footageItem, fixExp);
        return JSON.stringify({ status: "success" }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function addToRenderQueue(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp || !(comp instanceof CompItem)) {
            var ci = args.compIndex ? parseInt(args.compIndex, 10) : 0;
            if (ci > 0) {
                var it = app.project.item(ci);
                if (it instanceof CompItem) {
                    comp = it;
                }
            }
        }
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Composition not found");
        }
        var rqItem = app.project.renderQueue.items.add(comp);
        if (args.outputPath) {
            var om = rqItem.outputModule(1);
            om.file = new File(args.outputPath);
        }
        return JSON.stringify({ status: "success", rqItemIndex: rqItem.index }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function createLightLayer(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var name = args.name || "Light";
        var cx = args.centerX !== undefined ? parseFloat(args.centerX) : comp.width / 2;
        var cy = args.centerY !== undefined ? parseFloat(args.centerY) : comp.height / 2;
        var light = comp.layers.addLight(name, [cx, cy]);
        return JSON.stringify({ status: "success", index: light.index, name: light.name }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function createCameraLayer(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var name = args.name || "Camera";
        var cx = args.centerX !== undefined ? parseFloat(args.centerX) : comp.width / 2;
        var cy = args.centerY !== undefined ? parseFloat(args.centerY) : comp.height / 2;
        var cam = comp.layers.addCamera(name, [cx, cy]);
        if (args.zoom !== undefined && args.zoom !== null) {
            cam.property("Camera Options").property("Zoom").setValue(parseFloat(args.zoom));
        }
        return JSON.stringify({ status: "success", index: cam.index, name: cam.name }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setTimeRemapKeyframes(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        layer.timeRemapEnabled = true;
        var trg = layer.property("ADBE Time Remap");
        if (!trg) {
            trg = layer.property("Time Remap");
        }
        if (!trg) {
            throw new Error("Time Remap property not found");
        }
        var tr = trg.property("Time");
        if (!tr) {
            tr = trg.property(1);
        }
        var n = args.times && args.times.length ? args.times.length : 0;
        for (var i = 0; i < n; i++) {
            var tm = parseFloat(args.times[i]);
            var val = parseFloat(args.values[i]);
            tr.setValueAtTime(tm, val);
        }
        return JSON.stringify({ status: "success" }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function validateExpression(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        var propName = args.propertyName || "Position";
        var prop = layer.property("Transform").property(propName);
        var expr = args.expressionString || "";
        var keep = args.keepExpression === true;
        prop.expression = expr;
        if (!keep) {
            prop.expression = "";
        }
        return JSON.stringify({ status: "success", valid: true, kept: keep }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", valid: false, message: e.toString() }, null, 2);
    }
}

function createNullLayer(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var nullLayer = comp.layers.addNull();
        if (args.name) {
            nullLayer.name = String(args.name);
        }
        var cx = args.centerX !== undefined ? parseFloat(args.centerX) : comp.width / 2;
        var cy = args.centerY !== undefined ? parseFloat(args.centerY) : comp.height / 2;
        nullLayer.property("Position").setValue([cx, cy]);
        if (args.threeD === true) {
            nullLayer.threeDLayer = true;
        }
        return JSON.stringify({
            status: "success",
            index: nullLayer.index,
            name: nullLayer.name
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setTrackMatte(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var layer = comp.layer(args.layerIndex);
        if (!layer) {
            throw new Error("Layer not found");
        }
        var typeStr = args.trackMatteType;
        if (typeStr === undefined || typeStr === null || typeStr === "NONE" || typeStr === "NO_TRACK_MATTE" || typeStr === 0) {
            layer.trackMatteType = TrackMatteType.NO_TRACK_MATTE;
            layer.trackMatteLayer = null;
            return JSON.stringify({ status: "success", message: "track matte cleared" }, null, 2);
        }
        var matte = comp.layer(args.matteLayerIndex);
        if (!matte) {
            throw new Error("Matte layer not found");
        }
        var tm = TrackMatteType.ALPHA;
        if (typeStr === "ALPHA_INVERTED" || typeStr === 2) {
            tm = TrackMatteType.ALPHA_INVERTED;
        } else if (typeStr === "LUMA" || typeStr === 3) {
            tm = TrackMatteType.LUMA;
        } else if (typeStr === "LUMA_INVERTED" || typeStr === 4) {
            tm = TrackMatteType.LUMA_INVERTED;
        } else if (typeStr === "ALPHA" || typeStr === 1) {
            tm = TrackMatteType.ALPHA;
        }
        layer.trackMatteLayer = matte;
        layer.trackMatteType = tm;
        return JSON.stringify({ status: "success", trackMatteType: layer.trackMatteType }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function renameLayer(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var layer = comp.layer(args.layerIndex);
        if (!layer) {
            throw new Error("Layer not found");
        }
        var nn = args.newName;
        if (nn === undefined || nn === null || String(nn).length === 0) {
            throw new Error("newName required");
        }
        layer.name = String(nn);
        return JSON.stringify({ status: "success", name: layer.name, index: layer.index }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function mcpGetProjectItemIndex(comp) {
    for (var pi = 1; pi <= app.project.numItems; pi++) {
        if (app.project.item(pi) === comp) {
            return pi;
        }
    }
    return -1;
}

function applySceneSpec(args) {
    try {
        var spec = args.spec || args;
        if (!spec || spec.version !== 1) {
            throw new Error("spec.version must be 1");
        }
        var comp = null;
        if (spec.compName) {
            comp = mcpFindComp({ compName: spec.compName });
        }
        if (!comp && spec.createComp) {
            var cr = createComposition(spec.createComp);
            var crp = JSON.parse(cr);
            if (crp.status !== "success") {
                throw new Error("createComp failed: " + (crp.message || cr));
            }
            comp = mcpFindComp({ compName: spec.createComp.name });
        }
        if (!comp) {
            comp = mcpFindComp(args);
        }
        if (!comp) {
            throw new Error("Composition not found; set spec.compName or spec.createComp");
        }
        var compIndex = mcpGetProjectItemIndex(comp);
        if (compIndex < 1) {
            throw new Error("Could not resolve project item index for composition");
        }
        var steps = spec.steps || [];
        if (steps.length < 1) {
            throw new Error("No steps in spec");
        }
        app.beginUndoGroup("applySceneSpec");
        var results = [];
        for (var si = 0; si < steps.length; si++) {
            var step = steps[si];
            var invoke = step.invoke || step.command;
            if (!invoke) {
                throw new Error("step " + si + " missing invoke");
            }
            if (invoke === "executeBatch" || invoke === "applySceneSpec") {
                throw new Error("forbidden invoke in scene spec: " + invoke);
            }
            var a = step.args || {};
            a.compName = comp.name;
            a.compIndex = compIndex;
            var r = dispatchCommand(invoke, a);
            var parsed = JSON.parse(r);
            if (parsed.status === "error") {
                throw new Error("step " + si + " " + invoke + ": " + (parsed.message || parsed.error || "failed"));
            }
            if (parsed.error && String(parsed.error).indexOf("Unknown command") === 0) {
                throw new Error("step " + si + ": " + parsed.error);
            }
            results.push({ index: si, invoke: invoke, ok: true });
        }
        app.endUndoGroup();
        return JSON.stringify({ status: "success", stepsApplied: steps.length, results: results }, null, 2);
    } catch (e) {
        try {
            app.endUndoGroup();
        } catch (x) {}
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function addMaskToLayer(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var layer = comp.layer(args.layerIndex);
        if (!layer) {
            throw new Error("Layer not found");
        }
        var masks = layer.property("ADBE Mask Parade");
        var mask = masks.addProperty("ADBE Mask Atom");
        mask.name = args.name || "Mask 1";
        var shapeProp = mask.property("ADBE Mask Shape");
        var maskType = args.maskType || "rect";
        var w = parseFloat(args.width);
        if (isNaN(w)) {
            w = comp.width * 0.5;
        }
        var h = parseFloat(args.height);
        if (isNaN(h)) {
            h = comp.height * 0.5;
        }
        var x = args.x !== undefined ? parseFloat(args.x) : (comp.width - w) / 2;
        var y = args.y !== undefined ? parseFloat(args.y) : (comp.height - h) / 2;
        if (typeof Shape !== "undefined") {
            var myShape = new Shape();
            if (maskType === "ellipse") {
                var rx = w / 2;
                var ry = h / 2;
                var cx = x + rx;
                var cy = y + ry;
                var seg = 12;
                var verts = [];
                var ins = [];
                var outs = [];
                for (var s = 0; s < seg; s++) {
                    var ang = (s / seg) * Math.PI * 2;
                    verts.push([cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry]);
                    ins.push([0, 0]);
                    outs.push([0, 0]);
                }
                myShape.vertices = verts;
                myShape.inTangents = ins;
                myShape.outTangents = outs;
                myShape.closed = true;
            } else {
                myShape.vertices = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
                myShape.inTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
                myShape.outTangents = [[0, 0], [0, 0], [0, 0], [0, 0]];
                myShape.closed = true;
            }
            shapeProp.setValue(myShape);
        }
        return JSON.stringify({ status: "success", maskName: mask.name }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setMaskProperties(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var layer = comp.layer(args.layerIndex);
        var mi = parseInt(args.maskIndex, 10);
        var mask = layer.property("ADBE Mask Parade").property(mi);
        if (!mask) {
            throw new Error("Mask not found");
        }
        if (args.feather !== undefined && args.feather !== null) {
            mask.property("ADBE Mask Feather").setValue(parseFloat(args.feather));
        }
        if (args.expansion !== undefined && args.expansion !== null) {
            mask.property("ADBE Mask Offset").setValue(parseFloat(args.expansion));
        }
        if (args.inverted !== undefined && args.inverted !== null) {
            mask.property("ADBE Mask Invert").setValue(!!args.inverted);
        }
        return JSON.stringify({ status: "success" }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function copyEffectsFromLayer(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var src = comp.layer(args.sourceLayerIndex);
        var dst = comp.layer(args.destLayerIndex);
        var srcFx = src.property("Effects");
        var dstFx = dst.property("Effects");
        if (!srcFx || !dstFx) {
            throw new Error("Effects not available");
        }
        var copied = [];
        for (var i = 1; i <= srcFx.numProperties; i++) {
            var se = srcFx.property(i);
            var de = dstFx.addProperty(se.matchName);
            for (var j = 1; j <= se.numProperties; j++) {
                var sp = se.property(j);
                try {
                    if (sp.numKeys === 0 && sp.propertyValueType && sp.propertyValueType !== PropertyValueType.NO_VALUE) {
                        var dp = de.property(sp.name);
                        if (dp) {
                            dp.setValue(sp.value);
                        }
                    }
                } catch (ie) {}
            }
            copied.push(se.matchName);
        }
        return JSON.stringify({ status: "success", copied: copied }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setSourceTextKeyframe(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        if (!(layer instanceof TextLayer)) {
            throw new Error("Not a text layer");
        }
        var t = parseFloat(args.timeInSeconds);
        var st = layer.property("Source Text");
        var doc = st.value;
        doc.text = String(args.text || "");
        if (args.fontSize !== undefined && args.fontSize !== null) {
            doc.fontSize = parseFloat(args.fontSize);
        }
        st.setValueAtTime(t, doc);
        return JSON.stringify({ status: "success" }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setAudioLevelKeyframes(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        var audio = layer.property("Audio");
        if (!audio) {
            throw new Error("No audio on layer");
        }
        var levels = audio.property("Audio Levels");
        if (!levels) {
            throw new Error("Audio Levels not found");
        }
        var times = args.times;
        var values = args.values;
        if (!times || !values || times.length !== values.length) {
            throw new Error("times and values arrays must match");
        }
        for (var ai = 0; ai < times.length; ai++) {
            levels.setValueAtTime(parseFloat(times[ai]), parseFloat(values[ai]));
        }
        return JSON.stringify({ status: "success" }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function setKeyframeTemporalEase(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        var propName = args.propertyName || "Position";
        var prop = layer.property("Transform").property(propName);
        var keyIndex = parseInt(args.keyIndex, 10);
        var ein = parseFloat(args.easeInSpeed);
        if (isNaN(ein)) {
            ein = 33.33;
        }
        var einf = parseFloat(args.easeInInfluence);
        if (isNaN(einf)) {
            einf = 33.33;
        }
        var eout = parseFloat(args.easeOutSpeed);
        if (isNaN(eout)) {
            eout = 33.33;
        }
        var eoutf = parseFloat(args.easeOutInfluence);
        if (isNaN(eoutf)) {
            eoutf = 33.33;
        }
        var easeIn = new KeyframeEase(ein, einf);
        var easeOut = new KeyframeEase(eout, eoutf);
        var dims = prop.dimensionality;
        if (dims === 3) {
            prop.setTemporalEaseAtKey(keyIndex, [easeIn, easeIn, easeIn], [easeOut, easeOut, easeOut]);
        } else if (dims === 2) {
            prop.setTemporalEaseAtKey(keyIndex, [easeIn, easeIn], [easeOut, easeOut]);
        } else {
            prop.setTemporalEaseAtKey(keyIndex, [easeIn], [easeOut]);
        }
        return JSON.stringify({ status: "success" }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function snapshotLayerState(args) {
    try {
        var comp = app.project.item(args.compIndex);
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Invalid compIndex");
        }
        var layer = comp.layer(args.layerIndex);
        var tg = layer.property("Transform");
        var fx = [];
        var eff = layer.property("Effects");
        if (eff) {
            for (var fi = 1; fi <= eff.numProperties; fi++) {
                fx.push(eff.property(fi).name);
            }
        }
        var masks = 0;
        var mp = layer.property("ADBE Mask Parade");
        if (mp) {
            masks = mp.numProperties;
        }
        var rotVal = tg.property("Rotation").value;
        if (layer.threeDLayer) {
            rotVal = tg.property("Z Rotation").value;
        }
        return JSON.stringify({
            status: "success",
            snapshot: {
                name: layer.name,
                index: layer.index,
                matchName: layer.matchName,
                enabled: layer.enabled,
                threeDLayer: layer.threeDLayer,
                position: tg.property("Position").value,
                scale: tg.property("Scale").value,
                rotation: rotVal,
                opacity: tg.property("Opacity").value,
                effectNames: fx,
                maskCount: masks,
                inPoint: layer.inPoint,
                outPoint: layer.outPoint
            }
        }, null, 2);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function createPlaceholderSolid(args) {
    try {
        var comp = mcpFindComp(args);
        if (!comp) {
            throw new Error("Composition not found");
        }
        var solidArgs = {
            compName: comp.name,
            name: args.name || "PLACEHOLDER",
            color: args.color || [0.4, 0.4, 0.4],
            position: args.position || [comp.width / 2, comp.height / 2],
            size: args.size || [comp.width, comp.height],
            startTime: args.startTime !== undefined ? args.startTime : 0,
            duration: args.duration !== undefined ? args.duration : comp.duration
        };
        return createSolidLayer(solidArgs);
    } catch (e) {
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function executeBatch(args) {
    try {
        var cmds = args.commands;
        if (!cmds || !(cmds instanceof Array) || cmds.length < 1) {
            throw new Error("commands array required");
        }
        var cont = args.continueOnError === true;
        var results = [];
        app.beginUndoGroup("MCP executeBatch");
        for (var bi = 0; bi < cmds.length; bi++) {
            var c = cmds[bi];
            var cmd = c.command;
            var a = c.args || {};
            try {
                if (cmd === "executeBatch") {
                    throw new Error("nested executeBatch not allowed");
                }
                var r = dispatchCommand(cmd, a);
                var parsed = JSON.parse(r);
                var cmdOk = true;
                if (parsed.status === "error") {
                    cmdOk = false;
                }
                if (parsed.error && String(parsed.error).indexOf("Unknown command") === 0) {
                    cmdOk = false;
                }
                if (cmdOk) {
                    results.push({ index: bi, command: cmd, ok: true, result: parsed });
                } else {
                    results.push({ index: bi, command: cmd, ok: false, error: parsed.message || parsed.error || "command failed", result: parsed });
                    if (!cont) {
                        app.endUndoGroup();
                        return JSON.stringify({ status: "error", stoppedAt: bi, results: results }, null, 2);
                    }
                }
            } catch (err) {
                var errMsg = err.toString();
                results.push({ index: bi, command: cmd, ok: false, error: errMsg });
                if (!cont) {
                    app.endUndoGroup();
                    return JSON.stringify({ status: "error", stoppedAt: bi, results: results }, null, 2);
                }
            }
        }
        app.endUndoGroup();
        return JSON.stringify({ status: "success", results: results }, null, 2);
    } catch (e) {
        try {
            app.endUndoGroup();
        } catch (x) {}
        return JSON.stringify({ status: "error", message: e.toString() }, null, 2);
    }
}

function dispatchCommand(command, args) {
    args = args || {};
    switch (command) {
        case "getProjectInfo":
            return getProjectInfo();
        case "listCompositions":
            return listCompositions();
        case "getLayerInfo":
            return getLayerInfo();
        case "getBridgeCapabilities":
            return getBridgeCapabilities(args);
        case "listLayersDetailed":
            return listLayersDetailed(args);
        case "getCompositionDetails":
            return getCompositionDetails(args);
        case "listProjectItems":
            return listProjectItems(args);
        case "listTransformPropertyNames":
            return listTransformPropertyNames(args);
        case "samplePropertyAtTime":
            return samplePropertyAtTime(args);
        case "getPropertyKeyframeTimes":
            return getPropertyKeyframeTimes(args);
        case "duplicateLayer":
            return duplicateLayer(args);
        case "setLayerParent":
            return setLayerParent(args);
        case "moveLayerToIndex":
            return moveLayerToIndex(args);
        case "setLayerBlendMode":
            return setLayerBlendMode(args);
        case "splitLayerAtTime":
            return splitLayerAtTime(args);
        case "precomposeLayers":
            return precomposeLayers(args);
        case "setCompositionSettings":
            return setCompositionSettings(args);
        case "createProjectFolder":
            return createProjectFolder(args);
        case "moveProjectItem":
            return moveProjectItem(args);
        case "addCompositionMarkers":
            return addCompositionMarkers(args);
        case "addLayerMarkers":
            return addLayerMarkers(args);
        case "deleteKeyframesInRange":
            return deleteKeyframesInRange(args);
        case "applyEffectStack":
            return applyEffectStack(args);
        case "importFootage":
            return importFootage(args);
        case "replaceLayerSource":
            return replaceLayerSource(args);
        case "addToRenderQueue":
            return addToRenderQueue(args);
        case "createLightLayer":
            return createLightLayer(args);
        case "createCameraLayer":
            return createCameraLayer(args);
        case "setTimeRemapKeyframes":
            return setTimeRemapKeyframes(args);
        case "validateExpression":
            return validateExpression(args);
        case "createNullLayer":
            return createNullLayer(args);
        case "setTrackMatte":
            return setTrackMatte(args);
        case "renameLayer":
            return renameLayer(args);
        case "applySceneSpec":
            return applySceneSpec(args);
        case "addMaskToLayer":
            return addMaskToLayer(args);
        case "setMaskProperties":
            return setMaskProperties(args);
        case "copyEffectsFromLayer":
            return copyEffectsFromLayer(args);
        case "setSourceTextKeyframe":
            return setSourceTextKeyframe(args);
        case "setAudioLevelKeyframes":
            return setAudioLevelKeyframes(args);
        case "setKeyframeTemporalEase":
            return setKeyframeTemporalEase(args);
        case "snapshotLayerState":
            return snapshotLayerState(args);
        case "createPlaceholderSolid":
            return createPlaceholderSolid(args);
        case "executeBatch":
            return executeBatch(args);
        case "createComposition":
            return createComposition(args);
        case "createTextLayer":
            return createTextLayer(args);
        case "createShapeLayer":
            return createShapeLayer(args);
        case "createSolidLayer":
            return createSolidLayer(args);
        case "setLayerProperties":
            return setLayerProperties(args);
        case "setLayerKeyframe":
            return setLayerKeyframe(args.compIndex, args.layerIndex, args.propertyName, args.timeInSeconds, args.value);
        case "setLayerExpression":
            return setLayerExpression(args.compIndex, args.layerIndex, args.propertyName, args.expressionString);
        case "applyEffect":
            return applyEffect(args);
        case "applyEffectTemplate":
            return applyEffectTemplate(args);
        case "bridgeTestEffects":
            return bridgeTestEffects(args);
        case "setupSceneParallax":
            return setupSceneParallax(args);
        default:
            return JSON.stringify({ error: "Unknown command: " + command });
    }
}

// Execute command (commandId correlates with Node ae_command.json / MCP waitForBridgeResult)
function executeCommand(command, args, commandId) {
    var result = "";
    commandId = commandId || "";
    
    logToPanel("Executing command: " + command);
    statusText.text = "Running: " + command;
    panel.update();
    
    try {
        logToPanel("Attempting to execute: " + command);
        result = dispatchCommand(command, args);
        logToPanel("Execution finished for: " + command);
        
        // Save the result (ensure result is always a string)
        logToPanel("Preparing to write result file...");
        var resultString = (typeof result === 'string') ? result : JSON.stringify(result);
        
        // Try to parse the result as JSON to add a timestamp
        try {
            var resultObj = JSON.parse(resultString);
            // Add a timestamp to help identify if we're getting fresh results
            resultObj._responseTimestamp = new Date().toISOString();
            resultObj._commandExecuted = command;
            resultObj._bridgeApiVersion = "2.0";
            if (commandId) {
                resultObj._commandId = commandId;
            }
            resultString = JSON.stringify(resultObj, null, 2);
            logToPanel("Added timestamp to result JSON for tracking freshness.");
        } catch (parseError) {
            // If it's not valid JSON, append the timestamp as a comment
            logToPanel("Could not parse result as JSON to add timestamp: " + parseError.toString());
            // We'll still continue with the original string
        }
        
        var resultFile = new File(getResultFilePath());
        resultFile.encoding = "UTF-8"; // Ensure UTF-8 encoding
        logToPanel("Opening result file for writing...");
        var opened = resultFile.open("w");
        if (!opened) {
            logToPanel("ERROR: Failed to open result file for writing: " + resultFile.fsName);
            throw new Error("Failed to open result file for writing.");
        }
        logToPanel("Writing to result file...");
        var written = resultFile.write(resultString);
        if (!written) {
             logToPanel("ERROR: Failed to write to result file (write returned false): " + resultFile.fsName);
             // Still try to close, but log the error
        }
        logToPanel("Closing result file...");
        var closed = resultFile.close();
         if (!closed) {
             logToPanel("ERROR: Failed to close result file: " + resultFile.fsName);
             // Continue, but log the error
        }
        logToPanel("Result file write process complete.");
        
        logToPanel("Command completed successfully: " + command); // Changed log message
        statusText.text = "Command completed: " + command;
        
        // Update command file status
        logToPanel("Updating command status to completed...");
        updateCommandStatus("completed");
        logToPanel("Command status updated.");
        
    } catch (error) {
        var errorMsg = "ERROR in executeCommand for '" + command + "': " + error.toString() + (error.line ? " (line: " + error.line + ")" : "");
        logToPanel(errorMsg); // Log detailed error
        statusText.text = "Error: " + error.toString();
        
        // Write detailed error to result file
        try {
            logToPanel("Attempting to write ERROR to result file...");
            var errPayload = { 
                status: "error", 
                command: command,
                message: error.toString(),
                line: error.line,
                fileName: error.fileName
            };
            if (commandId) {
                errPayload._commandId = commandId;
            }
            var errorResult = JSON.stringify(errPayload);
            var errorFile = new File(getResultFilePath());
            errorFile.encoding = "UTF-8";
            if (errorFile.open("w")) {
                errorFile.write(errorResult);
                errorFile.close();
                logToPanel("Successfully wrote ERROR to result file.");
            } else {
                 logToPanel("CRITICAL ERROR: Failed to open result file to write error!");
            }
        } catch (writeError) {
             logToPanel("CRITICAL ERROR: Failed to write error to result file: " + writeError.toString());
        }
        
        // Update command file status even after error
        logToPanel("Updating command status to error...");
        updateCommandStatus("error");
        logToPanel("Command status updated to error.");
    }
}

// Update command file status
function updateCommandStatus(status) {
    try {
        var commandFile = new File(getCommandFilePath());
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();
            
            if (content) {
                var commandData = JSON.parse(content);
                commandData.status = status;
                
                commandFile.open("w");
                commandFile.write(JSON.stringify(commandData, null, 2));
                commandFile.close();
            }
        }
    } catch (e) {
        logToPanel("Error updating command status: " + e.toString());
    }
}

// Log message to panel
function logToPanel(message) {
    var timestamp = new Date().toLocaleTimeString();
    logText.text = timestamp + ": " + message + "\n" + logText.text;
}

// Check for new commands
function checkForCommands() {
    if (!autoRunCheckbox.value || isChecking) return;
    
    isChecking = true;
    
    try {
        var commandFile = new File(getCommandFilePath());
        if (commandFile.exists) {
            commandFile.open("r");
            var content = commandFile.read();
            commandFile.close();
            
            if (content) {
                var commandData = (typeof JSON !== "undefined" && JSON.parse)
                    ? JSON.parse(content)
                    : eval("(" + content + ")");
                
                // Only execute pending commands
                if (commandData.status === "pending") {
                    // Update status to running
                    updateCommandStatus("running");
                    
                    // Execute the command
                    executeCommand(commandData.command, commandData.args || {}, commandData.commandId);
                }
            }
        }
    } catch (e) {
        logToPanel("Error checking for commands: " + e.toString());
    }
    
    isChecking = false;
}

// Set up timer to check for commands
function startCommandChecker() {
    app.scheduleTask("checkForCommands()", checkInterval, true);
}

// Add manual check button
var checkButton = panel.add("button", undefined, "Check for Commands Now");
checkButton.onClick = function() {
    logToPanel("Manually checking for commands");
    checkForCommands();
};

// Log startup
logToPanel("MCP Bridge Auto started");
logToPanel("Command file: " + getCommandFilePath());
statusText.text = "Ready - Auto-run is " + (autoRunCheckbox.value ? "ON" : "OFF");

// Start the command checker
startCommandChecker();

// Show the panel
panel.center();
panel.show();

import { traverseLayers } from "../app/functions/traverse-layers";
import { ColorFormat, isEqual, solidPaintToWebRgb } from "figx"

export async function createStyleGuide(parentContainer: FrameNode, node: SceneNode) {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });

    const styleContainerName = 'Style Guide';
    let container = parentContainer.findOne((node) => node.name === styleContainerName) as FrameNode;
    if (!container) {
        container = figma.createFrame();
        container.name = styleContainerName
        container.layoutMode = 'VERTICAL'
        container.counterAxisSizingMode = 'AUTO'
        container.counterAxisAlignItems = 'MIN'
        container.verticalPadding = 16
        container.horizontalPadding = 16
        container.itemSpacing = 24
    }

    const colorStylesTitle = figma.createText()
    colorStylesTitle.characters = 'Color styles'
    colorStylesTitle.fontSize = 24
    container.appendChild(colorStylesTitle)

    const colorStyles = figma.createFrame()
    colorStyles.name = 'Color Styles'
    colorStyles.layoutMode = 'HORIZONTAL'
    colorStyles.counterAxisSizingMode = 'AUTO'
    colorStyles.counterAxisAlignItems = 'MIN'
    colorStyles.itemSpacing = 12
    container.appendChild(colorStyles)

    const textStyleTitle = figma.createText()
    textStyleTitle.characters = 'Text styles'
    textStyleTitle.fontSize = 24
    container.appendChild(textStyleTitle)

    const textStyles = figma.createFrame()
    textStyles.name = 'Text Styles'
    textStyles.layoutMode = 'HORIZONTAL'
    textStyles.counterAxisSizingMode = 'AUTO'
    textStyles.counterAxisAlignItems = 'MIN'
    textStyles.itemSpacing = 12
    container.appendChild(textStyles)

    let paints: Paint[] = [];
    let fonts: any[] = [];

    await traverseLayers(node, (layer) => {

        if (layer.type === "TEXT") {
            layer
                .getStyledTextSegments(['fontName', 'fontSize', 'fontWeight', 'lineHeight'])
                .map(({ fontName, fontSize, lineHeight }) => ({ fontName, fontSize, lineHeight }))
                .forEach(font => {
                    if (!fonts.some(item => isEqual(item, font))) {
                        fonts.push(font);
                    }
                })
        }

        if ('fills' in layer) {
            if (layer.fills !== figma.mixed) {
                // For now, variable creation only handles SOLID paints
                layer.fills.filter(fill => fill.type === "SOLID").forEach(fill => {
                    if (!paints.some(paint => isEqual(paint, fill))) {
                        paints.push(fill)
                    }
                })
            }
        }
    })

    const collection = figma.variables.getLocalVariableCollections().find(collection => collection.name === "colors") || figma.variables.createVariableCollection("colors");


    paints.forEach((paint) => {
        const swatch = figma.createFrame();

        const colorVariable = figma.variables.createVariable(`Variable-${Date.now()}`, collection.id, 'COLOR');

        swatch.layoutMode = "VERTICAL"
        swatch.primaryAxisSizingMode = "AUTO";
        swatch.primaryAxisAlignItems = "MIN";
        swatch.counterAxisSizingMode = "AUTO";
        swatch.counterAxisAlignItems = "MIN";

        // Display the color
        const color = figma.createRectangle();
        color.resize(64, 64);
        color.cornerRadius = 6;
        color.fills = [paint];
        // Add borders to make light colors visible
        color.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.1 }]
        swatch.appendChild(color);

        // Display the value of the color in hex.
        const value = figma.createText();

        if (paint.type === "SOLID") {
            const colorString = solidPaintToWebRgb(paint, ColorFormat.STRING)
            value.characters = swatch.name = typeof colorString === 'string' ? colorString : "unknown"

            colorVariable.setValueForMode(collection.modes[0].modeId, {
                r: paint.color.r,
                g: paint.color.g,
                b: paint.color.b,
                a: paint.opacity
            })
        }

        swatch.appendChild(value);
        colorStyles.appendChild(swatch)
    })

    fonts.sort((a, b) => a.fontSize - b.fontSize).forEach(font => {
        const entry = figma.createFrame();
        entry.layoutMode = 'VERTICAL'
        entry.counterAxisSizingMode = 'AUTO'
        entry.counterAxisAlignItems = 'MIN'

        const example = figma.createText();
        example.characters = 'Text';
        example.fontName = font.fontName;
        example.fontSize = font.fontSize;
        example.lineHeight = font.lineHeight;

        const fontName = figma.createText();
        fontName.characters = font.fontName.family;

        const fontProp = figma.createText();
        const fontSize = font.fontSize;
        const lineHeight = font.lineHeight.unit === 'AUTO' ? font.lineHeight.unit : font.lineHeight.value + font.lineHeight.unit
        fontProp.characters = fontSize + "/" + lineHeight;

        entry.appendChild(example)
        entry.appendChild(fontName)
        entry.appendChild(fontProp)

        const textStyle = figma.createTextStyle();
        textStyle.name = `${font.fontName.style}/${font.fontSize}`
        textStyle.fontName = font.fontName
        textStyle.fontSize = font.fontSize
        textStyle.lineHeight = font.lineHeight

        textStyles.appendChild(entry);
    })

    return container;
}
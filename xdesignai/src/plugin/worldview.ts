import { notifyError } from './notify';
import {
  Transaction,
  WorldviewContainerNode,
  WorldviewEffect,
  WorldviewIconContainerNode,
  WorldviewNode,
  WorldviewPaint,
  WorldviewSolidPaint,
  WorldviewTextNode,
  WorldviewVoidContainerNode,
  WorldviewVectorNode,
  WorldviewGroupNode,
  WorldviewInstanceNode,
  WorldviewEllipseNode,
  WorldviewBooleanOperationNode,
  WorldviewLineNode,
  WorldviewStarNode,
  WorldviewPolygonNode,
} from './types';

function isHeuristicallyWorldviewIconNode(sceneNode: SceneNode): boolean {
  switch (sceneNode.type) {
    case 'FRAME':
    case 'COMPONENT':
    case 'COMPONENT_SET':
    case 'INSTANCE':
      if (
        Math.trunc(sceneNode.width) <= 64 &&
        Math.trunc(sceneNode.height) <= 64 &&
        // Math.trunc(sceneNode.width) === Math.trunc(sceneNode.height) &&
        sceneNode.children.length > 0
      ) {
        return true;
      }
  }
  return false;
}

function extractWorldviewPaintFromFills(sceneNode: SceneNode): Transaction<WorldviewPaint | undefined> {
  if ('fills' in sceneNode) {
    if (sceneNode.fills === figma.mixed) {
      notifyError('sceneNode.fills === figma.mixed');
      figma.currentPage.selection = [sceneNode];
      figma.viewport.zoom = 0.5;
      return [null, false];
    } else {
      const sortedFills = [...sceneNode.fills].sort((a, b) => {
        if (a.type === 'IMAGE' && b.type === 'SOLID') {
          // Image takes precedence
          return -1;
        } else if (a.type === 'SOLID' && b.type === 'IMAGE') {
          return +1;
        }
        return 0;
      });
      for (const fill of sortedFills) {
        if (fill.visible === undefined) continue; // Nothing to do
        if (fill.opacity === undefined) continue; // Nothing to do
        switch (fill.type) {
          case 'SOLID': {
            if (fill.visible && fill.opacity > 0) {
              return [
                {
                  type: 'SOLID',
                  color: {
                    r: fill.color.r,
                    g: fill.color.g,
                    b: fill.color.b,
                    a: fill.opacity, // Clean up Figma ...
                  },
                },
                true,
              ];
            }
            break;
          }
          case 'IMAGE': {
            const imageHash = fill.imageHash;
            if (imageHash === null) {
              notifyError('imageHash === null');
              figma.currentPage.selection = [sceneNode];
              figma.viewport.zoom = 0.5;
              return [null, false];
            }
            if (fill.visible && fill.opacity > 0) {
              return [
                {
                  type: 'IMAGE',
                  scaleMode: fill.scaleMode,
                  imageHash,
                },
                true,
              ];
            }
            break;
          }
          case 'GRADIENT_LINEAR':
          case 'GRADIENT_RADIAL':
          case 'GRADIENT_DIAMOND':
          case 'GRADIENT_ANGULAR': {
            if (fill.visible && fill.opacity > 0) {
              return [
                {
                  type: fill.type,
                  gradientStops: fill.gradientStops.map((gs) => gs),
                  gradientTransform: fill.gradientTransform,
                },
                true,
              ];
            }
            break;
          }
        }
      }
    }
  }
  return [undefined, true];
}

function extractWorldviewSolidPaintFromFills(sceneNode: SceneNode): Transaction<WorldviewSolidPaint | undefined> {
  if ('fills' in sceneNode) {
    if (sceneNode.fills === figma.mixed) {
      return [
        {
          type: 'SOLID',
          color: {
            r: 0,
            g: 0,
            b: 0,
            a: 1,
          },
        },
        true,
      ];
    } else {
      for (const fill of sceneNode.fills) {
        if (fill.visible === undefined) continue; // Nothing to do
        if (fill.opacity === undefined) continue; // Nothing to do
        switch (fill.type) {
          case 'SOLID':
            if (fill.visible && fill.opacity > 0) {
              return [
                {
                  type: 'SOLID',
                  color: {
                    r: fill.color.r,
                    g: fill.color.g,
                    b: fill.color.b,
                    a: fill.opacity, // Clean up Figma ...
                  },
                },
                true,
              ];
            }
            break;
        }
      }
    }
  }
  return [undefined, true];
}

function extractWorldviewSolidPaintFromStrokes(sceneNode: SceneNode): Transaction<WorldviewSolidPaint | undefined> {
  if ('strokes' in sceneNode) {
    for (const stroke of sceneNode.strokes) {
      if (stroke.visible === undefined) continue; // Nothing to do
      if (stroke.opacity === undefined) continue; // Nothing to do
      switch (stroke.type) {
        case 'SOLID':
          if (stroke.visible && stroke.opacity > 0) {
            return [
              {
                type: 'SOLID',
                color: {
                  r: stroke.color.r,
                  g: stroke.color.g,
                  b: stroke.color.b,
                  a: stroke.opacity, // Clean up Figma ...
                },
              },
              true,
            ];
          }
          break;
      }
    }
  }
  return [undefined, true];
}

function recurisvelyExtractWorldviewSolidPaintFromFills(
  sceneNode: SceneNode
): Transaction<WorldviewSolidPaint | undefined> {
  const [fill, fillOK] = extractWorldviewSolidPaintFromFills(sceneNode);
  if (!fillOK) {
    return [null, fillOK];
  } else if (fillOK && fill !== undefined) {
    return [fill, fillOK];
  } else {
    if ('children' in sceneNode) {
      for (const child of sceneNode.children) {
        const [childFill, childFillOK] = recurisvelyExtractWorldviewSolidPaintFromFills(child);
        if (!childFillOK) {
          return [null, false];
        } else if (childFillOK && childFill !== undefined) {
          return [childFill, true];
        }
      }
    }
  }
  return [undefined, true];
}

function recurisvelyExtractWorldviewSolidPaintFromStrokes(
  sceneNode: SceneNode
): Transaction<WorldviewSolidPaint | undefined> {
  const [stroke, strokeOK] = extractWorldviewSolidPaintFromStrokes(sceneNode);
  if (!strokeOK) {
    return [null, strokeOK];
  } else if (strokeOK && stroke !== undefined) {
    return [stroke, strokeOK];
  } else {
    if ('children' in sceneNode) {
      for (const child of sceneNode.children) {
        const [childStroke, childStrokeOK] = recurisvelyExtractWorldviewSolidPaintFromStrokes(child);
        if (!childStrokeOK) {
          return [null, false];
        } else if (childStrokeOK && childStroke !== undefined) {
          return [childStroke, true];
        }
      }
    }
  }
  return [undefined, true];
}

export async function extractWorldviewContainerNode(
  node: FrameNode | ComponentNode | ComponentSetNode | InstanceNode | GroupNode
): Promise<WorldviewContainerNode | WorldviewInstanceNode | null> {
  const frameNode = node as FrameNode | ComponentNode | InstanceNode;
  let flag = true;
  if (frameNode.type === 'INSTANCE') {
    flag = false;
  }
  const idealized: WorldviewContainerNode | WorldviewInstanceNode = {
    type: flag === true ? 'CONTAINER' : 'INSTANCE',
    id: frameNode.id,
    name: frameNode.name,
    x: frameNode.x,
    y: frameNode.y,
    width: frameNode.width === 0 ? 0.01 : frameNode.width,
    height: frameNode.height === 0 ? 0.01 : frameNode.height,
  } as WorldviewContainerNode | WorldviewInstanceNode;

  //Layout
  idealized.layoutMode = frameNode.layoutMode;
  idealized.layoutPositioning = frameNode.layoutPositioning;
  idealized.primaryAxisAlignItems = frameNode.primaryAxisAlignItems;
  idealized.counterAxisAlignItems = frameNode.counterAxisAlignItems;
  idealized.itemSpacing = frameNode.itemSpacing;
  // Padding
  if (frameNode.paddingTop > 0) idealized.paddingTop = frameNode.paddingTop;
  if (frameNode.paddingBottom > 0) idealized.paddingBottom = frameNode.paddingBottom;
  if (frameNode.paddingLeft > 0) idealized.paddingLeft = frameNode.paddingLeft;
  if (frameNode.paddingRight > 0) idealized.paddingRight = frameNode.paddingRight;

  // Fill
  const [fill, fillOK] = extractWorldviewPaintFromFills(frameNode);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Stroke
  const [stroke, strokeOK] = extractWorldviewSolidPaintFromStrokes(frameNode);
  if (!strokeOK) {
    return null;
  }
  if (
    (frameNode.strokeTopWeight > 0 ||
      frameNode.strokeBottomWeight > 0 ||
      frameNode.strokeLeftWeight > 0 ||
      frameNode.strokeRightWeight > 0) &&
    strokeOK &&
    stroke !== undefined
  ) {
    if (frameNode.strokeTopWeight > 0) idealized.strokeTopWeight = frameNode.strokeTopWeight;
    if (frameNode.strokeBottomWeight > 0) idealized.strokeBottomWeight = frameNode.strokeBottomWeight;
    if (frameNode.strokeLeftWeight > 0) idealized.strokeLeftWeight = frameNode.strokeLeftWeight;
    if (frameNode.strokeRightWeight > 0) idealized.strokeRightWeight = frameNode.strokeRightWeight;
    idealized.stroke = stroke;
  }

  // Corner radius
  if (frameNode.topLeftRadius > 0) idealized.topLeftRadius = frameNode.topLeftRadius;
  if (frameNode.topRightRadius > 0) idealized.topRightRadius = frameNode.topRightRadius;
  if (frameNode.bottomLeftRadius > 0) idealized.bottomLeftRadius = frameNode.bottomLeftRadius;
  if (frameNode.bottomRightRadius > 0) idealized.bottomRightRadius = frameNode.bottomRightRadius;

  // Effects
  const effects: WorldviewEffect[] = [];
  for (const effect of frameNode.effects) {
    switch (effect.type) {
      case 'DROP_SHADOW':
      case 'INNER_SHADOW':
        if (effect.visible && effect.color.a > 0) {
          effects.push({
            type: effect.type, // Copy "as is"
            color: effect.color, // Copy "as is"
            offset: effect.offset, // Copy "as is"
            radius: effect.radius, // Copy "as is"
            spread: effect.spread, // Copy "as is"
          });
        }
        break;
    }
  }
  if (effects.length > 0) {
    // Sanity check
    idealized.effects = effects;
  }

  resizeFrameToFitContent(frameNode);

  // Children
  const children: WorldviewNode[] = [];
  for (const child of frameNode.children) {
    if (!child.visible) continue;
    const idealizedChild = await extractWorldviewNode(child);
    if (idealizedChild === null) {
      return null;
    }
    children.push(idealizedChild);
  }

  frameNode.resize(idealized.width, idealized.height);
  if (children.length === 0) {
    idealized.children = null;
  } else {
    idealized.children = children;
  }

  if (frameNode.reactions !== undefined) {
    idealized.reaction = clone(frameNode.reactions);
  }

  return idealized;
}

export async function extractWorldviewVoidContainerNode(
  rectangleNode: RectangleNode
): Promise<WorldviewVoidContainerNode | null> {
  const idealized: WorldviewVoidContainerNode = {
    type: 'VOID_CONTAINER',
    id: rectangleNode.id,
    name: rectangleNode.name,
    x: rectangleNode.x,
    y: rectangleNode.y,
    width: rectangleNode.width,
    height: rectangleNode.height,
  } as WorldviewVoidContainerNode;

  // Fill
  const [fill, fillOK] = extractWorldviewPaintFromFills(rectangleNode);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Stroke
  const [stroke, strokeOK] = extractWorldviewSolidPaintFromStrokes(rectangleNode);
  if (!strokeOK) {
    return null;
  }
  if (
    (rectangleNode.strokeTopWeight > 0 ||
      rectangleNode.strokeBottomWeight > 0 ||
      rectangleNode.strokeLeftWeight > 0 ||
      rectangleNode.strokeRightWeight > 0) &&
    strokeOK &&
    stroke !== undefined
  ) {
    if (rectangleNode.strokeTopWeight > 0) idealized.strokeTopWeight = rectangleNode.strokeTopWeight;
    if (rectangleNode.strokeBottomWeight > 0) idealized.strokeBottomWeight = rectangleNode.strokeBottomWeight;
    if (rectangleNode.strokeLeftWeight > 0) idealized.strokeLeftWeight = rectangleNode.strokeLeftWeight;
    if (rectangleNode.strokeRightWeight > 0) idealized.strokeRightWeight = rectangleNode.strokeRightWeight;
    idealized.stroke = stroke;
  }

  // Corner radius
  if (rectangleNode.topLeftRadius > 0) idealized.topLeftRadius = rectangleNode.topLeftRadius;
  if (rectangleNode.topRightRadius > 0) idealized.topRightRadius = rectangleNode.topRightRadius;
  if (rectangleNode.bottomLeftRadius > 0) idealized.bottomLeftRadius = rectangleNode.bottomLeftRadius;
  if (rectangleNode.bottomRightRadius > 0) idealized.bottomRightRadius = rectangleNode.bottomRightRadius;

  if (rectangleNode.reactions !== undefined) {
    idealized.reaction = clone(rectangleNode.reactions);
  }

  // Effects
  const effects: WorldviewEffect[] = [];
  for (const effect of rectangleNode.effects) {
    switch (effect.type) {
      case 'DROP_SHADOW':
      case 'INNER_SHADOW':
        if (effect.visible && effect.color.a > 0) {
          effects.push({
            type: effect.type, // Copy "as is"
            color: effect.color, // Copy "as is"
            offset: effect.offset, // Copy "as is"
            radius: effect.radius, // Copy "as is"
            spread: effect.spread, // Copy "as is"
          });
        }
        break;
    }
  }
  if (effects.length > 0) {
    // Sanity check
    idealized.effects = effects;
  }

  return idealized;
}

export async function extractWorldviewIconContainerNode(
  node: FrameNode | ComponentNode | ComponentSetNode | InstanceNode
): Promise<WorldviewIconContainerNode | null> {
  const frameNode = node as FrameNode | ComponentNode;
  const idealized: WorldviewIconContainerNode = {
    type: 'ICON_CONTAINER',
    id: frameNode.id,
    name: frameNode.name,
    x: frameNode.x,
    y: frameNode.y,
    width: frameNode.width,
    height: frameNode.height,
  } as WorldviewIconContainerNode;

  // Fill
  const [fill, fillOK] = recurisvelyExtractWorldviewSolidPaintFromFills(frameNode);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Stroke
  const [stroke, strokeOK] = recurisvelyExtractWorldviewSolidPaintFromStrokes(frameNode);
  if (!strokeOK) {
    return null;
  }
  idealized.stroke = stroke;

  if (frameNode.reactions !== undefined) {
    idealized.reaction = clone(frameNode.reactions);
  }

  if (frameNode.strokeWeight !== figma.mixed) {
    if (frameNode.strokeWeight > 0) idealized.strokeWeight = frameNode.strokeWeight;
  }

  // Data
  let originalClipsContent = frameNode.clipsContent;
  try {
    const childVisible: boolean[] = [];
    for (const child of frameNode.children) {
      childVisible.push(child.visible);
      child.visible = true;
    }
    frameNode.clipsContent = false;
    const data = await frameNode.exportAsync({ format: 'SVG_STRING' });
    idealized.data = data;
    frameNode.children.forEach((child, index) => {
      child.visible = childVisible[index];
    });
  } catch (error) {
    notifyError(`SVG failed to export: ${error}`);
    figma.currentPage.selection = [frameNode];
    figma.viewport.zoom = 0.5;
    return null;
  } finally {
    frameNode.clipsContent = originalClipsContent;
  }

  return idealized;
}

export async function extractWorldviewEllipseNode(ellipseNode: EllipseNode): Promise<WorldviewEllipseNode | null> {
  const idealized: WorldviewEllipseNode = {
    type: 'ELLIPSE',
    id: ellipseNode.id,
    name: ellipseNode.name,
    x: ellipseNode.x,
    y: ellipseNode.y,
    width: ellipseNode.width,
    height: ellipseNode.height,
  } as WorldviewEllipseNode;
  // Fill
  const [fill, fillOK] = extractWorldviewPaintFromFills(ellipseNode);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Stroke
  const [stroke, strokeOK] = recurisvelyExtractWorldviewSolidPaintFromStrokes(ellipseNode);
  if (!strokeOK) {
    return null;
  }
  idealized.stroke = stroke;

  if (ellipseNode.reactions !== undefined) {
    idealized.reaction = clone(ellipseNode.reactions);
  }

  if (ellipseNode.strokeWeight === figma.mixed) {
    notifyError('frame.strokeWeight === figma.mixed');
    return null;
  } else {
    if (ellipseNode.strokeWeight > 0) idealized.strokeWeight = ellipseNode.strokeWeight;
  }

  return idealized;
}

export async function extractWorldviewLineNode(node: LineNode): Promise<WorldviewLineNode | null> {
  const lineNode = node as LineNode;
  const idealized: WorldviewLineNode = {
    type: 'LINE',
    id: lineNode.id,
    name: lineNode.name,
    x: lineNode.x,
    y: lineNode.y,
    rotation: lineNode.rotation,
    width: lineNode.width,
    height: lineNode.height,
  } as WorldviewLineNode;

  // Fill
  const [fill, fillOK] = extractWorldviewPaintFromFills(lineNode);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Effects
  const effects: WorldviewEffect[] = [];
  for (const effect of lineNode.effects) {
    switch (effect.type) {
      case 'DROP_SHADOW':
      case 'INNER_SHADOW':
        if (effect.visible && effect.color.a > 0) {
          effects.push({
            type: effect.type, // Copy "as is"
            color: effect.color, // Copy "as is"
            offset: effect.offset, // Copy "as is"
            radius: effect.radius, // Copy "as is"
            spread: effect.spread, // Copy "as is"
          });
        }
        break;
    }
  }

  const [stroke, strokeOK] = recurisvelyExtractWorldviewSolidPaintFromStrokes(lineNode);
  if (!strokeOK) {
    return null;
  }
  idealized.stroke = stroke;

  if (lineNode.strokeWeight === figma.mixed) {
    notifyError('frame.strokeWeight === figma.mixed');
    return null;
  } else {
    if (lineNode.strokeWeight > 0) idealized.strokeWeight = lineNode.strokeWeight;
  }

  if (effects.length > 0) {
    // Sanity check
    idealized.effects = effects;
  }

  if (lineNode.reactions !== undefined) {
    idealized.reaction = clone(lineNode.reactions);
  }

  return idealized;
}

export async function extractWorldviewBooleanOperationNode(
  node: BooleanOperationNode
): Promise<WorldviewContainerNode | WorldviewBooleanOperationNode | null> {
  const frameNode = node as BooleanOperationNode;
  const idealized: WorldviewBooleanOperationNode = {
    type: 'BOOLEAN_OPERATION',
    id: frameNode.id,
    name: frameNode.name,
    x: frameNode.x,
    y: frameNode.y,
    width: frameNode.width,
    height: frameNode.height,
    booleanOperation: frameNode.booleanOperation,
  } as WorldviewBooleanOperationNode;

  // Fill
  const [fill, fillOK] = extractWorldviewPaintFromFills(frameNode);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Effects
  const effects: WorldviewEffect[] = [];
  for (const effect of frameNode.effects) {
    switch (effect.type) {
      case 'DROP_SHADOW':
      case 'INNER_SHADOW':
        if (effect.visible && effect.color.a > 0) {
          effects.push({
            type: effect.type, // Copy "as is"
            color: effect.color, // Copy "as is"
            offset: effect.offset, // Copy "as is"
            radius: effect.radius, // Copy "as is"
            spread: effect.spread, // Copy "as is"
          });
        }
        break;
    }
  }
  if (effects.length > 0) {
    // Sanity check
    idealized.effects = effects;
  }

  if (frameNode.reactions !== undefined) {
    idealized.reaction = clone(frameNode.reactions);
  }

  // Children
  const children: WorldviewNode[] = [];
  for (const child of frameNode.children) {
    if (!child.visible) continue;
    const idealizedChild = await extractWorldviewNode(child);
    if (idealizedChild === null) {
      return null;
    }
    children.push(idealizedChild);
  }
  if (children.length === 0) {
    idealized.children = null;
  } else {
    idealized.children = children;
  }
  return idealized;
}

export async function extractWorldviewStarNode(node: StarNode): Promise<WorldviewStarNode | null> {
  const starNode = node as StarNode;
  const idealized: WorldviewStarNode = {
    type: 'STAR',
    id: starNode.id,
    name: starNode.name,
    x: starNode.x,
    y: starNode.y,
    width: starNode.width,
    height: starNode.height,
    rotation: starNode.rotation,
    cornerRadius: starNode.cornerRadius,
    count: starNode.pointCount,
    ratio: starNode.innerRadius,
    cornerSmoothing: starNode.cornerSmoothing,
    constrainProportions: starNode.constrainProportions,
  } as WorldviewStarNode;
  // Fill
  const [fill, fillOK] = extractWorldviewPaintFromFills(node);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Stroke
  const [stroke, strokeOK] = recurisvelyExtractWorldviewSolidPaintFromStrokes(starNode);
  if (!strokeOK) {
    return null;
  }
  idealized.stroke = stroke;

  if (starNode.strokeWeight === figma.mixed) {
    notifyError('frame.strokeWeight === figma.mixed');
    return null;
  } else {
    if (starNode.strokeWeight > 0) idealized.strokeWeight = starNode.strokeWeight;
  }

  if (starNode.reactions !== undefined) {
    idealized.reaction = clone(starNode.reactions);
  }

  return idealized;
}

export async function extractWorldviewPolygonNode(node: PolygonNode): Promise<WorldviewPolygonNode | null> {
  const polygonNode = node as PolygonNode;
  const idealized: WorldviewPolygonNode = {
    type: 'POLYGON',
    id: polygonNode.id,
    name: polygonNode.name,
    x: polygonNode.x,
    y: polygonNode.y,
    width: polygonNode.width,
    height: polygonNode.height,
    rotation: polygonNode.rotation,
    cornerRadius: polygonNode.cornerRadius,
    count: polygonNode.pointCount,
    cornerSmoothing: polygonNode.cornerSmoothing,
    constrainProportions: polygonNode.constrainProportions,
  } as WorldviewPolygonNode;
  // Fill
  const [fill, fillOK] = extractWorldviewPaintFromFills(node);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Stroke
  const [stroke, strokeOK] = recurisvelyExtractWorldviewSolidPaintFromStrokes(polygonNode);
  if (!strokeOK) {
    return null;
  }
  idealized.stroke = stroke;

  if (polygonNode.strokeWeight === figma.mixed) {
    notifyError('frame.strokeWeight === figma.mixed');
    return null;
  } else {
    if (polygonNode.strokeWeight > 0) idealized.strokeWeight = polygonNode.strokeWeight;
  }

  if (polygonNode.reactions !== undefined) {
    idealized.reaction = clone(polygonNode.reactions);
  }

  return idealized;
}

export async function extractWorldviewTextNode(textNode: TextNode): Promise<WorldviewTextNode | null> {
  const idealized: WorldviewTextNode = {
    type: 'TEXT',
    id: textNode.id,
    name: textNode.name,
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height,
    truncation: textNode.textTruncation,
  } as WorldviewTextNode;

  // Fill
  const [fill, fillOK] = extractWorldviewSolidPaintFromFills(textNode);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Font name
  if (textNode.fontName === figma.mixed) {
    idealized.fontName = { family: 'Inter', style: 'Regular' };
  } else idealized.fontName = textNode.fontName;

  // Font size
  if (textNode.fontSize === figma.mixed) {
    idealized.fontSize = 16;
  } else idealized.fontSize = textNode.fontSize;

  // Font weight
  if (textNode.fontWeight === figma.mixed) {
    idealized.fontWeight = 400;
  } else idealized.fontWeight = textNode.fontWeight;

  // Letter spacing
  if (textNode.letterSpacing === figma.mixed) {
    idealized.letterSpacing = {
      value: 0,
      unit: 'PIXELS',
    };
  } else idealized.letterSpacing = textNode.letterSpacing;

  // Line height
  if (textNode.lineHeight === figma.mixed) {
    idealized.lineHeight = { value: 0, unit: 'PIXELS' };
  } else idealized.lineHeight = textNode.lineHeight;

  // Text align horizontal
  idealized.textAlignHorizontal = textNode.textAlignHorizontal;

  // Text align vertical
  idealized.textAlignVertical = textNode.textAlignVertical;

  // Text case
  switch (textNode.textCase) {
    case 'ORIGINAL':
      idealized.textCase = 'ORIGINAL';
      break;
    case 'UPPER':
      idealized.textCase = 'UPPER';
      break;
    case 'LOWER':
      idealized.textCase = 'LOWER';
      break;
    case 'TITLE':
    case 'SMALL_CAPS':
    case 'SMALL_CAPS_FORCED':
      notifyError(`Unsupported text case: ${textNode.textCase}`);
      figma.currentPage.selection = [textNode];
      figma.viewport.zoom = 0.5;
      break;
  }

  if (textNode.reactions !== undefined) {
    idealized.reaction = clone(textNode.reactions);
  }

  // Characters
  idealized.characters = textNode.characters;

  // Text Truncate
  idealized.truncation = textNode.textTruncation;

  return idealized;
}

export async function extractWorldviewVectorNode(vectorNode: VectorNode): Promise<WorldviewVectorNode | null> {
  const idealized: WorldviewVectorNode = {
    type: 'VECTOR',
    id: vectorNode.id,
    name: vectorNode.name,
    x: vectorNode.x,
    y: vectorNode.y,
    width: vectorNode.width > 0.1 ? vectorNode.width : 0.1,
    height: vectorNode.height > 0.1 ? vectorNode.height : 0.1,
  } as WorldviewVectorNode;

  // Fill
  const [fill, fillOK] = recurisvelyExtractWorldviewSolidPaintFromFills(vectorNode);
  if (!fillOK) {
    return null;
  }
  idealized.fill = fill;

  // Stroke
  const [stroke, strokeOK] = recurisvelyExtractWorldviewSolidPaintFromStrokes(vectorNode);
  if (!strokeOK) {
    return null;
  }
  idealized.stroke = stroke;

  if (vectorNode.strokeWeight === figma.mixed) {
    notifyError('frame.strokeWeight === figma.mixed');
    return null;
  } else {
    if (vectorNode.strokeWeight > 0) idealized.strokeWeight = vectorNode.strokeWeight;
  }

  if (vectorNode.reactions !== undefined) {
    idealized.reaction = clone(vectorNode.reactions);
  }

  // Data
  try {
    idealized.vectorPaths = JSON.parse(JSON.stringify(vectorNode.vectorPaths));
    idealized.vectorNetwork = JSON.parse(JSON.stringify(vectorNode.vectorNetwork));
  } catch (error) {
    notifyError(`SVG failed to export: ${error}`);
    figma.currentPage.selection = [vectorNode];
    figma.viewport.zoom = 0.5;
    return null;
  } finally {
  }

  return idealized;
}

export async function extractWorldviewGroupNode(
  node: FrameNode | ComponentNode | ComponentSetNode | InstanceNode | GroupNode
): Promise<WorldviewGroupNode | null> {
  const groupNode = node as GroupNode | ComponentNode;
  const idealized: WorldviewGroupNode = {
    type: 'GROUP',
    id: groupNode.id,
    name: groupNode.name,
    x: groupNode.x,
    y: groupNode.y,
    width: groupNode.width,
    height: groupNode.height,
  } as WorldviewGroupNode;

  // Effects
  const effects: WorldviewEffect[] = [];
  for (const effect of groupNode.effects) {
    switch (effect.type) {
      case 'DROP_SHADOW':
      case 'INNER_SHADOW':
        if (effect.visible && effect.color.a > 0) {
          effects.push({
            type: effect.type, // Copy "as is"
            color: effect.color, // Copy "as is"
            offset: effect.offset, // Copy "as is"
            radius: effect.radius, // Copy "as is"
            spread: effect.spread, // Copy "as is"
          });
        }
        break;
    }
  }
  if (effects.length > 0) {
    // Sanity check
    idealized.effects = effects;
  }

  if (groupNode.reactions !== undefined) {
    idealized.reaction = clone(groupNode.reactions);
  }

  // Children
  const children: WorldviewNode[] = [];
  for (const child of groupNode.children) {
    if (!child.visible) continue;
    const idealizedChild = await extractWorldviewNode(child);
    if (idealizedChild === null) {
      return null;
    }
    children.push(idealizedChild);
  }
  if (children.length === 0) {
    idealized.children = null;
  } else {
    idealized.children = children;
  }
  return idealized;
}

export async function extractWorldviewNode(sceneNode: SceneNode): Promise<WorldviewNode | null> {
  switch (sceneNode.type) {
    case 'FRAME':
    case 'COMPONENT':
    case 'COMPONENT_SET':
    case 'INSTANCE':
      if (isHeuristicallyWorldviewIconNode(sceneNode)) {
        return await extractWorldviewIconContainerNode(sceneNode);
      } else {
        return await extractWorldviewContainerNode(sceneNode);
      }
    case 'RECTANGLE':
      return await extractWorldviewVoidContainerNode(sceneNode);
    case 'ELLIPSE':
      return await extractWorldviewEllipseNode(sceneNode);
    case 'STAR':
      return await extractWorldviewStarNode(sceneNode);
    case 'POLYGON':
      return await extractWorldviewPolygonNode(sceneNode);
    case 'BOOLEAN_OPERATION':
      return await extractWorldviewBooleanOperationNode(sceneNode);
    case 'LINE':
      return await extractWorldviewLineNode(sceneNode);
    case 'TEXT':
      return await extractWorldviewTextNode(sceneNode);
    case 'VECTOR':
      return await extractWorldviewVectorNode(sceneNode);
    case 'GROUP':
      return await extractWorldviewGroupNode(sceneNode);
    default:
      notifyError(`Unsupported node type: ${sceneNode.type}`);
      figma.currentPage.selection = [sceneNode];
      figma.viewport.zoom = 0.5;
      break;
  }
  return null;
}

function clone(val: any): any {
  const type = typeof val;
  if (val === null) {
    return null;
  } else if (type === 'undefined' || type === 'number' || type === 'string' || type === 'boolean') {
    return val;
  } else if (type === 'object') {
    if (val instanceof Array) {
      return val.map((x) => clone(x));
    } else if (val instanceof Uint8Array) {
      return new Uint8Array(val);
    } else {
      let o: { [key: string]: any } = {};
      for (const key in val) {
        o[key] = clone(val[key]);
      }
      return o;
    }
  }
  throw new Error('unknown');
}

function resizeFrameToFitContent(frameNode: FrameNode | InstanceNode | ComponentNode | GroupNode): void {
  let maxX: number = frameNode.width < 0.01 ? 0.1 : frameNode.width;
  let maxY: number = frameNode.height < 0.01 ? 0.1 : frameNode.height;

  frameNode.children.forEach((child: SceneNode) => {
    if ('x' in child && 'y' in child && 'width' in child && 'height' in child) {
      const childRight: number = child.x + child.width;
      const childBottom: number = child.y + child.height;
      if (childRight > maxX) maxX = childRight;
      if (childBottom > maxY) maxY = childBottom;
    }
  });

  frameNode.resize(maxX, maxY);
}

import { DownloadResponse } from '../ui/app_api';
import { extractEmanationSDKAssetsFromDownloadResponse } from './assets';
import { isNullOrEmpty } from './utils';
import { sleep } from './sleep';
import {
  Origin,
  WorldviewContainerNode,
  WorldviewIconContainerNode,
  WorldviewNode,
  WorldviewSolidPaint,
  WorldviewImagePaint,
  WorldviewTextNode,
  WorldviewVoidContainerNode,
  inspectValue,
  EmanationSDKAssets,
  WorldviewPaint,
  WorldviewVectorNode,
  WorldviewGradientPaint,
  WorldviewGroupNode,
  WorldviewComponentNode,
  WorldviewInstanceNode,
  WorldviewEllipseNode,
  WorldviewBooleanOperationNode,
  WorldviewLineNode,
  WorldviewStarNode,
  WorldviewPolygonNode,
} from './types';
import { count } from 'console';
import { Component } from 'react';

function recursivelySetFill(sceneNode: SceneNode, fill: SolidPaint): void {
  if ('fills' in sceneNode) {
    sceneNode.fills = [fill];
  }
  if ('children' in sceneNode) {
    for (const child of sceneNode.children) {
      recursivelySetFill(child, fill);
    }
  }
}

function recursivelySetStroke(
  sceneNode: SceneNode,
  strokeWeight: number,
  stroke: SolidPaint
): void {
  if ('strokes' in sceneNode) {
    sceneNode.strokeWeight = strokeWeight;
    sceneNode.strokes = [stroke];
  }
  if ('children' in sceneNode) {
    for (const child of sceneNode.children) {
      recursivelySetStroke(child, strokeWeight, stroke);
    }
  }
}

function parseFontWeight(fontWeight: number) {
  if (!fontWeight) return 'Regular';

  let fontStyle = 'Regular';
  switch (fontWeight) {
    case 100:
      fontStyle = 'Thin';
      break;
    case 200:
      fontStyle = 'Extra Light';
      break;
    case 300:
      fontStyle = 'Light';
      break;
    case 400:
      fontStyle = 'Regular';
      break;
    case 500:
      fontStyle = 'Medium';
      break;
    case 600:
      fontStyle = 'Semi Bold';
      break;
    case 700:
      fontStyle = 'Bold';
      break;
    case 800:
      fontStyle = 'Extra Bold';
      break;
    case 900:
      fontStyle = 'Black';
      break;
  }
  return fontStyle;
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// Figma is pedantic about RGBA versus RGB + opacity ...
const isImagePaint = (paint: any): paint is WorldviewImagePaint =>
  paint.imageHash != null;

const isGradientPaint = (paint: any): paint is WorldviewGradientPaint =>
  !!paint.gradientStops?.length;

function convertWorldviewPaint(
  worldview: WorldviewPaint,
  assets?: EmanationSDKAssets
): Paint {
  if (isImagePaint(worldview)) {
    const imageHash = assets
      ? (assets[worldview.imageHash] as string)
      : worldview.imageHash;
    return {
      type: 'IMAGE',
      scaleMode: worldview.scaleMode,
      imageHash: imageHash || null,
    };
  }

  if (isGradientPaint(worldview)) return worldview;

  const solidPaintView = worldview as SolidPaint;
  return {
    type: 'SOLID',
    color: {
      r: solidPaintView.color.r,
      g: solidPaintView.color.g,
      b: solidPaintView.color.b,
    },
    opacity: (solidPaintView.color as RGBA).a || solidPaintView.opacity,
  };
}

async function drawWorldviewContainerNode(
  worldview: WorldviewContainerNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const frameNode = figma.createFrame();
  isMapping[worldview.id] = frameNode.id;
  frameNode.name = worldview.name;
  frameNode.x = worldview.x;
  frameNode.y = worldview.y;
  frameNode.resizeWithoutConstraints(worldview.width, worldview.height);
  frameNode.fills = []; // Must clear!
  //// frameNode.clipsContent = worldview.clipsContent
  frameNode.layoutMode = 'NONE';
  // frameNode.layoutPositioning = worldview.layoutPositioning || 'ABSOLUTE';
  frameNode.primaryAxisAlignItems = worldview.primaryAxisAlignItems || 'CENTER';
  frameNode.counterAxisAlignItems = worldview.counterAxisAlignItems || 'CENTER';
  frameNode.paddingTop = worldview.paddingTop || 0;
  frameNode.paddingBottom = worldview.paddingBottom || 0;
  frameNode.paddingLeft = worldview.paddingLeft || 0;
  frameNode.paddingRight = worldview.paddingRight || 0;
  frameNode.itemSpacing = worldview.itemSpacing || 0;

  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    frameNode.fills = [fillPaint];
  }

  // Stroke
  if (
    (worldview.strokeTopWeight !== undefined ||
      worldview.strokeBottomWeight !== undefined ||
      worldview.strokeLeftWeight !== undefined ||
      worldview.strokeRightWeight !== undefined) &&
    worldview.stroke !== undefined
  ) {
    if (worldview.strokeTopWeight !== undefined)
      frameNode.strokeTopWeight = worldview.strokeTopWeight;
    if (worldview.strokeBottomWeight !== undefined)
      frameNode.strokeBottomWeight = worldview.strokeBottomWeight;
    if (worldview.strokeLeftWeight !== undefined)
      frameNode.strokeLeftWeight = worldview.strokeLeftWeight;
    if (worldview.strokeRightWeight !== undefined)
      frameNode.strokeRightWeight = worldview.strokeRightWeight;

    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    frameNode.strokes = [solidPaint];
  }

  // Corner radius
  if (
    worldview.topLeftRadius !== undefined ||
    worldview.topRightRadius !== undefined ||
    worldview.bottomLeftRadius !== undefined ||
    worldview.bottomRightRadius !== undefined
  ) {
    if (worldview.topLeftRadius !== undefined)
      frameNode.topLeftRadius = worldview.topLeftRadius;
    if (worldview.topRightRadius !== undefined)
      frameNode.topRightRadius = worldview.topRightRadius;
    if (worldview.bottomLeftRadius !== undefined)
      frameNode.bottomLeftRadius = worldview.bottomLeftRadius;
    if (worldview.bottomRightRadius !== undefined)
      frameNode.bottomRightRadius = worldview.bottomRightRadius;
  }

  // Effects
  if (worldview.effects !== undefined) {
    const effects: Effect[] = [];
    for (const effect of worldview.effects) {
      switch (effect.type) {
        case 'DROP_SHADOW':
        case 'INNER_SHADOW':
          effects.push({
            type: effect.type,
            color: effect.color,
            offset: effect.offset,
            radius: effect.radius,
            spread: effect.spread,
            visible: true,
            blendMode: 'NORMAL',
          });
          break;
      }
    }
    if (effects.length > 0) {
      // Sanity check
      frameNode.effects = effects;
    }
  }

  // Children
  parentNode.appendChild(frameNode);
  if (worldview.children !== null) {
    for (let i = 0; i < worldview.children.length; i++) {
      const child = worldview.children[i];
      if (i > 0) {
        if (settings.timeout > 0) {
          await sleep(settings.timeout);
        }
      }
      await drawWorldviewNode(child, frameNode, settings, isMapping);
    }
  }
}

async function drawWorldviewComponentNode(
  worldview: WorldviewInstanceNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const componentNode = figma.createComponent();
  isMapping[worldview.id] = componentNode.id;
  componentNode.name = worldview.name;
  componentNode.x = worldview.x;
  componentNode.y = worldview.y;
  componentNode.resizeWithoutConstraints(worldview.width, worldview.height);
  componentNode.fills = []; // Must clear!
  //// frameNode.clipsContent = worldview.clipsContent
  componentNode.layoutMode = 'NONE';
  // componentNode.layoutPositioning = worldview.layoutPositioning || 'ABSOLUTE';
  componentNode.primaryAxisAlignItems =
    worldview.primaryAxisAlignItems || 'CENTER';
  componentNode.counterAxisAlignItems =
    worldview.counterAxisAlignItems || 'CENTER';
  componentNode.paddingTop = worldview.paddingTop || 0;
  componentNode.paddingBottom = worldview.paddingBottom || 0;
  componentNode.paddingLeft = worldview.paddingLeft || 0;
  componentNode.paddingRight = worldview.paddingRight || 0;
  componentNode.itemSpacing = worldview.itemSpacing || 0;

  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        // TODO: Resolve variable references here
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        break;
    }
    componentNode.fills = [fillPaint];
  }

  // Stroke
  if (
    (worldview.strokeTopWeight !== undefined ||
      worldview.strokeBottomWeight !== undefined ||
      worldview.strokeLeftWeight !== undefined ||
      worldview.strokeRightWeight !== undefined) &&
    worldview.stroke !== undefined
  ) {
    if (worldview.strokeTopWeight !== undefined)
      componentNode.strokeTopWeight = worldview.strokeTopWeight;
    if (worldview.strokeBottomWeight !== undefined)
      componentNode.strokeBottomWeight = worldview.strokeBottomWeight;
    if (worldview.strokeLeftWeight !== undefined)
      componentNode.strokeLeftWeight = worldview.strokeLeftWeight;
    if (worldview.strokeRightWeight !== undefined)
      componentNode.strokeRightWeight = worldview.strokeRightWeight;

    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        // TODO: Resolve variable references here
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    componentNode.strokes = [solidPaint];
  }

  // Corner radius
  if (
    worldview.topLeftRadius !== undefined ||
    worldview.topRightRadius !== undefined ||
    worldview.bottomLeftRadius !== undefined ||
    worldview.bottomRightRadius !== undefined
  ) {
    if (worldview.topLeftRadius !== undefined)
      componentNode.topLeftRadius = worldview.topLeftRadius;
    if (worldview.topRightRadius !== undefined)
      componentNode.topRightRadius = worldview.topRightRadius;
    if (worldview.bottomLeftRadius !== undefined)
      componentNode.bottomLeftRadius = worldview.bottomLeftRadius;
    if (worldview.bottomRightRadius !== undefined)
      componentNode.bottomRightRadius = worldview.bottomRightRadius;
  }

  // Effects
  if (worldview.effects !== undefined) {
    const effects: Effect[] = [];
    for (const effect of worldview.effects) {
      switch (effect.type) {
        case 'DROP_SHADOW':
        case 'INNER_SHADOW':
          effects.push({
            type: effect.type,
            color: effect.color,
            offset: effect.offset,
            radius: effect.radius,
            spread: effect.spread,
            visible: true,
            blendMode: 'NORMAL',
          });
          break;
      }
    }
    if (effects.length > 0) {
      // Sanity check
      componentNode.effects = effects;
    }
  }
  const instanceNode = componentNode.createInstance();
  instanceNode.x = worldview.x;
  instanceNode.y = worldview.y;

  // Children
  parentNode.appendChild(instanceNode);
  if (worldview.children !== null) {
    for (let i = 0; i < worldview.children.length; i++) {
      const child = worldview.children[i];
      if (i > 0) {
        if (settings.timeout > 0) {
          await sleep(settings.timeout);
        }
      }
      await drawWorldviewNode(child, componentNode, settings, isMapping);
    }
  }
}

async function drawWorldviewGroupNode(
  worldview: WorldviewGroupNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const dummyRect = figma.createRectangle();
  dummyRect.visible = false;
  const frameNode = figma.group([dummyRect], parentNode);
  isMapping[worldview.id] = frameNode.id;
  frameNode.name = worldview.name;
  frameNode.x = worldview.x;
  frameNode.y = worldview.y;
  frameNode.resizeWithoutConstraints(worldview.width, worldview.height);
  // Effects
  if (worldview.effects !== undefined) {
    const effects: Effect[] = [];
    for (const effect of worldview.effects) {
      switch (effect.type) {
        case 'DROP_SHADOW':
        case 'INNER_SHADOW':
          effects.push({
            type: effect.type,
            color: effect.color,
            offset: effect.offset,
            radius: effect.radius,
            spread: effect.spread,
            visible: true,
            blendMode: 'NORMAL',
          });
          break;
        // Add other effect types if necessary
      }
    }
    if (effects.length > 0) {
      frameNode.effects = effects; // Apply the effects to the frameNode
    }
  }

  parentNode.appendChild(frameNode);

  // Children
  if (worldview.children !== null) {
    for (let i = 0; i < worldview.children.length; i++) {
      const child = worldview.children[i];
      if (i > 0 && settings.timeout > 0) {
        await sleep(settings.timeout); // Wait for the specified timeout before processing the next child
      }
      await drawWorldviewNode(child, frameNode, settings, isMapping); // Recursively draw each child node
    }
  }
}

async function drawWorldviewBooleanOperationNode(
  worldview: WorldviewBooleanOperationNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const frameNode = figma.createBooleanOperation();
  isMapping[worldview.id] = frameNode.id;
  figma.currentPage.appendChild(frameNode);

  frameNode.name = worldview.name;
  frameNode.x = worldview.x; // Ignore worldview.x here
  frameNode.y = worldview.y; // Ignore worldview.y here
  frameNode.resizeWithoutConstraints(worldview.width, worldview.height);
  frameNode.fills = []; // Must clear!
  frameNode.booleanOperation = worldview.booleanOperation;
  // frameNode.clipsContent = worldview.clipsContent

  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    frameNode.fills = [fillPaint];
  }
  parentNode.appendChild(frameNode);
  // Children
  if (worldview.children !== null) {
    for (const child of worldview.children) {
      await drawWorldviewNode(child, frameNode, settings, isMapping);
    }
  }
}

async function drawWorldviewVoidContainerNode(
  worldview: WorldviewVoidContainerNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const frameNode = figma.createFrame();
  isMapping[worldview.id] = frameNode.id;
  frameNode.name = worldview.name;
  frameNode.x = worldview.x;
  frameNode.y = worldview.y;
  frameNode.resizeWithoutConstraints(worldview.width, worldview.height);
  frameNode.fills = []; // Must clear!
  //// frameNode.clipsContent = worldview.clipsContent

  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    frameNode.fills = [fillPaint];
  }

  // Stroke
  if (
    (worldview.strokeTopWeight !== undefined ||
      worldview.strokeBottomWeight !== undefined ||
      worldview.strokeLeftWeight !== undefined ||
      worldview.strokeRightWeight !== undefined) &&
    worldview.stroke !== undefined
  ) {
    if (worldview.strokeTopWeight !== undefined)
      frameNode.strokeTopWeight = worldview.strokeTopWeight;
    if (worldview.strokeBottomWeight !== undefined)
      frameNode.strokeBottomWeight = worldview.strokeBottomWeight;
    if (worldview.strokeLeftWeight !== undefined)
      frameNode.strokeLeftWeight = worldview.strokeLeftWeight;
    if (worldview.strokeRightWeight !== undefined)
      frameNode.strokeRightWeight = worldview.strokeRightWeight;

    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    frameNode.strokes = [solidPaint];
  }

  // Corner radius
  if (
    worldview.topLeftRadius !== undefined ||
    worldview.topRightRadius !== undefined ||
    worldview.bottomLeftRadius !== undefined ||
    worldview.bottomRightRadius !== undefined
  ) {
    if (worldview.topLeftRadius !== undefined)
      frameNode.topLeftRadius = worldview.topLeftRadius;
    if (worldview.topRightRadius !== undefined)
      frameNode.topRightRadius = worldview.topRightRadius;
    if (worldview.bottomLeftRadius !== undefined)
      frameNode.bottomLeftRadius = worldview.bottomLeftRadius;
    if (worldview.bottomRightRadius !== undefined)
      frameNode.bottomRightRadius = worldview.bottomRightRadius;
  }

  // Effects
  if (worldview.effects !== undefined) {
    const effects: Effect[] = [];
    for (const effect of worldview.effects) {
      switch (effect.type) {
        case 'DROP_SHADOW':
        case 'INNER_SHADOW':
          effects.push({
            type: effect.type,
            color: effect.color,
            offset: effect.offset,
            radius: effect.radius,
            spread: effect.spread,
            visible: true,
            blendMode: 'NORMAL',
          });
          break;
      }
    }
    if (effects.length > 0) {
      // Sanity check
      frameNode.effects = effects;
    }
  }

  // Children
  parentNode.appendChild(frameNode);
}

async function drawWorldviewIconContainerNode(
  worldview: WorldviewIconContainerNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  let data: string;
  const inspected = inspectValue(worldview.data);
  switch (inspected.type) {
    case 'VALUE':
      data = inspected.value;
      break;
    case 'CONSTANT':
      data = inspected.value.value;
      break;
    case 'VARIABLE':
      // TODO: Resolve variable references here
      data = inspected.value.fallback;
      break;
  }

  const frameNode = figma.createNodeFromSvg(data);
  isMapping[worldview.id] = frameNode.id;
  frameNode.name = worldview.name;
  frameNode.x = worldview.x;
  frameNode.y = worldview.y;
  frameNode.resizeWithoutConstraints(worldview.width, worldview.height);
  frameNode.fills = []; // Must clear!
  //// frameNode.clipsContent = worldview.clipsContent

  // Fill
  if (worldview.fill !== undefined) {
    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    for (const child of frameNode.children) {
      recursivelySetFill(child, solidPaint);
    }
  }

  // Stroke
  if (worldview.strokeWeight !== undefined && worldview.stroke !== undefined) {
    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    for (const child of frameNode.children) {
      recursivelySetStroke(child, worldview.strokeWeight, solidPaint);
    }
  }

  parentNode.appendChild(frameNode);
}

async function drawWorldviewEllipseNode(
  worldview: WorldviewEllipseNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const ellipseNode = figma.createEllipse();
  isMapping[worldview.id] = ellipseNode.id;
  ellipseNode.x = worldview.x;
  ellipseNode.y = worldview.y;
  ellipseNode.resizeWithoutConstraints(worldview.width, worldview.height);
  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    ellipseNode.fills = [fillPaint];
  }

  // Stroke
  if (worldview.strokeWeight !== undefined && worldview.stroke !== undefined) {
    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
  }

  parentNode.appendChild(ellipseNode);
}

async function drawWorldviewStarNode(
  worldview: WorldviewStarNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const starNode = figma.createStar();
  isMapping[worldview.id] = starNode.id;
  starNode.x = worldview.x;
  starNode.y = worldview.y;
  starNode.resizeWithoutConstraints(worldview.width, worldview.height);
  starNode.rotation = worldview.rotation;
  starNode.cornerRadius = worldview.cornerRadius;
  starNode.pointCount = worldview.count;
  starNode.innerRadius = worldview.ratio;
  starNode.cornerSmoothing = worldview.cornerSmoothing;
  starNode.constrainProportions = worldview.constrainProportions;

  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    starNode.fills = [fillPaint];
  }

  // Stroke
  if (worldview.strokeWeight !== undefined && worldview.stroke !== undefined) {
    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
  }

  parentNode.appendChild(starNode);
}

async function drawWorldviewPolygonNode(
  worldview: WorldviewPolygonNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const polygonNode = figma.createPolygon();
  isMapping[worldview.id] = polygonNode.id;
  polygonNode.x = worldview.x;
  polygonNode.y = worldview.y;
  polygonNode.resizeWithoutConstraints(worldview.width, worldview.height);
  polygonNode.rotation = worldview.rotation;
  polygonNode.cornerRadius = worldview.cornerRadius;
  polygonNode.pointCount = worldview.count;
  polygonNode.cornerSmoothing = worldview.cornerSmoothing;
  polygonNode.constrainProportions = worldview.constrainProportions;

  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    polygonNode.fills = [fillPaint];
  }

  // Stroke
  if (worldview.strokeWeight !== undefined && worldview.stroke !== undefined) {
    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
  }

  parentNode.appendChild(polygonNode);
}

async function drawWorldviewLineNode(
  worldview: WorldviewLineNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const lineNode = figma.createLine();
  isMapping[worldview.id] = lineNode.id;
  lineNode.x = worldview.x;
  lineNode.y = worldview.y;
  lineNode.rotation = worldview.rotation;
  lineNode.resize(worldview.width, 0);
  // Fill

  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    lineNode.fills = [fillPaint];
  }

  if (worldview.strokeWeight !== undefined && worldview.stroke !== undefined) {
    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
  }

  parentNode.appendChild(lineNode);
}

async function drawWorldviewTextNode(
  worldview: WorldviewTextNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const textNode = figma.createText();
  isMapping[worldview.id] = textNode.id;
  textNode.x = worldview.x;
  textNode.y = worldview.y;
  textNode.resizeWithoutConstraints(worldview.width, worldview.height);

  // Fill
  if (worldview.fill !== undefined) {
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        textNode.fills = [figma.util.solidPaint(inspected.value.color)];
        break;
      case 'CONSTANT':
        textNode.fills = [figma.util.solidPaint(inspected.value.value.color)];
        break;
      case 'VARIABLE':
        textNode.fills = [
          figma.util.solidPaint(inspected.value.fallback.color),
        ];
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          textNode.fills = [
            figma.variables.setBoundVariableForPaint(
              textNode.fills[0] as SolidPaint,
              'color',
              colorVariable!
            ),
          ];
        }
        break;
    }
  }

  // Typography
  try {
    await figma.loadFontAsync(worldview.fontName);
    textNode.fontName = worldview.fontName;
  } catch (error) {
    await figma.loadFontAsync({
      family: 'Inter',
      style: parseFontWeight(worldview.fontWeight),
    });
    textNode.fontName = {
      family: 'Inter',
      style: parseFontWeight(worldview.fontWeight),
    };
  }
  textNode.fontSize = worldview.fontSize;
  textNode.letterSpacing = worldview.letterSpacing;
  textNode.lineHeight = worldview.lineHeight;
  textNode.textAlignHorizontal = worldview.textAlignHorizontal;
  textNode.textAlignVertical = worldview.textAlignVertical;
  textNode.textCase = worldview.textCase;
  if (worldview.truncation !== undefined)
    textNode.textTruncation = worldview.truncation;
  //// textNode.textAutoResize = worldview.textAutoResize

  // Characters
  parentNode.appendChild(textNode);

  let characters: string;
  const inspected = inspectValue(worldview.characters);
  switch (inspected.type) {
    case 'VALUE':
      characters = inspected.value;
      break;
    case 'CONSTANT':
      characters = inspected.value.value;
      break;
    case 'VARIABLE':
      // TODO: Resolve variable references here
      characters = inspected.value.fallback;
      break;
  }

  const words = characters.split(' ');
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (i > 0) {
      if (settings.timeout > 0) {
        await sleep(settings.timeout / 4);
      }
      textNode.characters += ' ';
    }
    textNode.characters += word;
  }
}

async function drawWorldviewVectorNode(
  worldview: WorldviewVectorNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const vectorNode = figma.createVector();
  isMapping[worldview.id] = vectorNode.id;
  vectorNode.name = worldview.name;
  vectorNode.x = worldview.x;
  vectorNode.y = worldview.y;
  vectorNode.resizeWithoutConstraints(worldview.width, worldview.height);
  vectorNode.fills = []; // Must clear!
  //// frameNode.clipsContent = worldview.clipsContent
  vectorNode.vectorPaths = worldview.vectorPaths;
  vectorNode.vectorNetwork = worldview.vectorNetwork;

  // Fill
  if (worldview.fill !== undefined) {
    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    vectorNode.fills = [solidPaint];
  }

  // Stroke
  if (worldview.strokeWeight !== undefined && worldview.stroke !== undefined) {
    let solidPaint: SolidPaint;
    const inspected = inspectValue(worldview.stroke);
    switch (inspected.type) {
      case 'VALUE':
        solidPaint = convertWorldviewPaint(inspected.value) as SolidPaint;
        break;
      case 'CONSTANT':
        solidPaint = convertWorldviewPaint(inspected.value.value) as SolidPaint;
        break;
      case 'VARIABLE':
        solidPaint = convertWorldviewPaint(
          inspected.value.fallback
        ) as SolidPaint;
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          solidPaint = figma.variables.setBoundVariableForPaint(
            solidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    vectorNode.strokes = [solidPaint];
  }

  parentNode.appendChild(vectorNode);
}

async function drawWorldviewNode(
  worldview: WorldviewNode,
  parentNode:
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentNode
    | BooleanOperationNode,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  switch (worldview.type) {
    case 'CONTAINER':
      await drawWorldviewContainerNode(
        worldview,
        parentNode,
        settings,
        isMapping
      );
      break;
    case 'INSTANCE':
      await drawWorldviewComponentNode(
        worldview,
        parentNode,
        settings,
        isMapping
      );
      break;
    case 'GROUP':
      await drawWorldviewGroupNode(worldview, parentNode, settings, isMapping);
      break;
    case 'VOID_CONTAINER':
      await drawWorldviewVoidContainerNode(
        worldview,
        parentNode,
        settings,
        isMapping
      );
      break;
    case 'ICON_CONTAINER':
      await drawWorldviewIconContainerNode(
        worldview,
        parentNode,
        settings,
        isMapping
      );
      break;
    case 'TEXT':
      await drawWorldviewTextNode(worldview, parentNode, settings, isMapping);
      break;
    case 'LINE':
      await drawWorldviewLineNode(worldview, parentNode, settings, isMapping);
      break;
    case 'BOOLEAN_OPERATION':
      await drawWorldviewBooleanOperationNode(
        worldview,
        parentNode,
        settings,
        isMapping
      );
      break;
    case 'ELLIPSE':
      await drawWorldviewEllipseNode(
        worldview,
        parentNode,
        settings,
        isMapping
      );
      break;
    case 'STAR':
      await drawWorldviewStarNode(worldview, parentNode, settings, isMapping);
      break;
    case 'POLYGON':
      await drawWorldviewPolygonNode(
        worldview,
        parentNode,
        settings,
        isMapping
      );
      break;
    case 'VECTOR':
      await drawWorldviewVectorNode(worldview, parentNode, settings, isMapping);
      break;
  }
}

// Ignore Auto Layout, preserve frames ...
export async function drawWorldViewContainerNodeAtOrigin(
  worldview: WorldviewContainerNode,
  origin: Origin,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const frameNode = figma.createFrame();
  isMapping[worldview.id] = frameNode.id;
  figma.currentPage.appendChild(frameNode);

  frameNode.name = worldview.name;
  frameNode.x = origin.x; // Ignore worldview.x here
  frameNode.y = origin.y; // Ignore worldview.y here
  frameNode.resizeWithoutConstraints(worldview.width, worldview.height);
  frameNode.fills = []; // Must clear!
  // frameNode.clipsContent = worldview.clipsContent
  frameNode.layoutMode = 'NONE';
  // frameNode.layoutPositioning = worldview.layoutPositioning || 'ABSOLUTE';
  frameNode.primaryAxisAlignItems = worldview.primaryAxisAlignItems || 'CENTER';
  frameNode.counterAxisAlignItems = worldview.counterAxisAlignItems || 'CENTER';
  frameNode.paddingTop = worldview.paddingTop || 0;
  frameNode.paddingBottom = worldview.paddingBottom || 0;
  frameNode.paddingLeft = worldview.paddingLeft || 0;
  frameNode.paddingRight = worldview.paddingRight || 0;
  frameNode.itemSpacing = worldview.itemSpacing || 0;

  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    frameNode.fills = [fillPaint];
  }
  // Children
  if (worldview.children !== null) {
    for (const child of worldview.children) {
      await drawWorldviewNode(child, frameNode, settings, isMapping);
    }
  }
}

export async function drawworldviewbooleanoperationNodeAtOrigin(
  worldview: WorldviewBooleanOperationNode,
  origin: Origin,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const frameNode = figma.createBooleanOperation();
  isMapping[worldview.id] = frameNode.id;
  figma.currentPage.appendChild(frameNode);

  frameNode.name = worldview.name;
  frameNode.x = origin.x; // Ignore worldview.x here
  frameNode.y = origin.y; // Ignore worldview.y here
  frameNode.resizeWithoutConstraints(worldview.width, worldview.height);
  frameNode.fills = []; // Must clear!
  frameNode.booleanOperation = worldview.booleanOperation;
  // frameNode.clipsContent = worldview.clipsContent

  // Fill
  if (worldview.fill !== undefined) {
    let fillPaint: Paint;
    const inspected = inspectValue(worldview.fill);
    switch (inspected.type) {
      case 'VALUE':
        fillPaint = convertWorldviewPaint(
          inspected.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'CONSTANT':
        fillPaint = convertWorldviewPaint(
          inspected.value.value as WorldviewPaint,
          settings.assets
        );
        break;
      case 'VARIABLE':
        fillPaint = convertWorldviewPaint(
          inspected.value.fallback as WorldviewPaint,
          settings.assets
        );
        if (settings.assets && settings.assets[inspected.value.id]) {
          const colorVariable = figma.variables.getVariableById(
            settings.assets[inspected.value.id] as string
          );
          fillPaint = figma.variables.setBoundVariableForPaint(
            fillPaint as SolidPaint,
            'color',
            colorVariable!
          );
        }
        break;
    }
    frameNode.fills = [fillPaint];
  }
  // Children
  if (worldview.children !== null) {
    for (const child of worldview.children) {
      await drawWorldviewNode(child, frameNode, settings, isMapping);
    }
  }
}

export async function drawWorldViewGroupNodeAtOrigin(
  worldview: WorldviewGroupNode,
  origin: Origin,
  settings: { timeout: number; assets?: EmanationSDKAssets },
  isMapping: any
): Promise<void> {
  const dummyRect = figma.createRectangle();
  // dummyRect.x = origin.x; // Ignore worldview.x here
  // dummyRect.y = origin.y; // Ignore worldview.y here
  dummyRect.visible = false;
  const groupNode = figma.group([dummyRect], figma.currentPage);
  isMapping[worldview.id] = groupNode.id;
  groupNode.name = worldview.name;
  groupNode.resizeWithoutConstraints(
    worldview.width === 0 ? worldview.width + 1 : worldview.width,
    worldview.height === 0 ? worldview.height + 1 : worldview.height
  );
  groupNode.x = origin.x; // Ignore worldview.x here
  groupNode.y = origin.y; // Ignore worldview.y here

  // Children
  figma.currentPage.appendChild(groupNode);
  if (worldview.children !== null) {
    for (const child of worldview.children) {
      await drawWorldviewNode(child, groupNode, settings, isMapping);
    }
  }
}

function clone(val: any): any {
  const type = typeof val;
  if (val === null) {
    return null;
  } else if (
    type === 'undefined' ||
    type === 'number' ||
    type === 'string' ||
    type === 'boolean'
  ) {
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

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// Convenience function
function getOriginForWorldviewRootContainerNodes(
  roots: WorldviewNode[]
): Origin {
  let totalWidth = 0;
  for (let i = 0; i < roots.length; i++) {
    const screen = roots[i];
    if (i > 0) {
      totalWidth += 16;
    }
    totalWidth += screen.width;
  }
  const origin: Origin = {
    x: Math.trunc(figma.viewport.center.x - totalWidth / 2),
    y: Math.trunc(figma.viewport.center.y - roots[0].height / 2),
  };
  return origin;
}

export async function drawRoots(
  roots: WorldviewNode[],
  settings: { timeout: number; assets?: EmanationSDKAssets }
): Promise<void> {
  const idMapping = {} as { [key: string]: any };
  const center = getOriginForWorldviewRootContainerNodes(roots);
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    if (i > 0) {
      center.x += 16;
    }

    switch (root.type) {
      case 'CONTAINER':
        await drawWorldViewContainerNodeAtOrigin(
          root,
          center,
          settings,
          idMapping
        );
        break;
      case 'GROUP':
        await drawWorldViewGroupNodeAtOrigin(root, center, settings, idMapping);
        break;
      case 'BOOLEAN_OPERATION':
        await drawworldviewbooleanoperationNodeAtOrigin(
          root,
          center,
          settings,
          idMapping
        );
        break;
    }

    center.x += root.width;
  }
  await setReactions(roots, idMapping);
}

export async function drawScreens(
  epoch: DownloadResponse,
  settings: { timeout: number }
): Promise<void> {
  // console.log("HERE", epoch)
  const assets = await extractEmanationSDKAssetsFromDownloadResponse(epoch);
  const roots = epoch.screens.map((screen) => screen.root);
  await drawRoots(roots, { ...settings, assets });
}

export async function setReactions(
  roots: WorldviewNode[],
  idMapping: any
): Promise<void> {
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i] as
      | WorldviewContainerNode
      | WorldviewGroupNode
      | WorldviewComponentNode
      | WorldviewInstanceNode;
    // ProtoType
    if (root.reaction !== undefined) {
      const node = figma.getNodeById(idMapping[root.id]);
      if (node) {
        let reactions = (node as FrameNode).reactions as Reaction[];
        let newReactions = clone(reactions);
        reactions = newReactions;
      }
    }
    if (root.children !== null) {
      for (const child of root.children) {
        await setChildReaction(child, idMapping);
      }
    }
  }
}

export async function setChildReaction(worldview: any, idMapping: any) {
  if (!isNullOrEmpty(worldview.reaction)) {
    const node: SceneNode = figma.getNodeById(
      idMapping[worldview.id]
    ) as SceneNode;
    if (node && 'reactions' in node) {
      let newReactions = clone(node.reactions);
      if (worldview.reaction[0].action.destinationId) {
        const id = worldview.reaction[0].action.destinationId;
        if (doesNodeExist(idMapping[id])) {
          worldview.reaction[0].action.destinationId = idMapping[id];
          worldview.reaction[0].actions[0].destinationId = idMapping[id];
          newReactions = worldview.reaction;
          node.reactions = newReactions;
        }
      }
    }
  }
  if (!isNullOrEmpty(worldview.children)) {
    for (let i = 0; i < worldview.children.length; i++) {
      const child = worldview.children[i];
      await setChildReaction(child, idMapping);
    }
  }
}

function doesNodeExist(nodeId: any) {
  const node = figma.getNodeById(nodeId);
  return node !== null;
}

import { notify } from './notify';
import {
  ConstantValue,
  EmanationSDKEpoch,
  EmanationSDKScreen,
  EmanationSDKTheme,
  InspectedValue,
  VariableValue,
  WorldviewContainerNode,
  WorldviewGradientPaint,
  WorldviewImagePaint,
  WorldviewNode,
  WorldviewPaint,
  WorldviewSinglePaint,
  WorldviewSolidPaint,
  inspectValue,
} from './types';
import {
  extractWorldviewContainerNode,
  extractWorldviewBooleanOperationNode,
} from './worldview';

function convertRGBAToHex(rgba: RGBA): string {
  let hexStr = '';
  hexStr += '#';
  hexStr += Math.round(rgba.r * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');
  hexStr += Math.round(rgba.g * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');
  hexStr += Math.round(rgba.b * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');
  if (rgba.a < 1) {
    hexStr += Math.round(rgba.a * 255)
      .toString(16)
      .toUpperCase()
      .padStart(2, '0');
  }
  return hexStr;
}

function hashPaint(paint: WorldviewPaint): string {
  switch (paint.type) {
    case 'SOLID':
      return convertRGBAToHex(paint.color);
    case 'IMAGE':
      return paint.imageHash;
    case 'GRADIENT_LINEAR':
    case 'GRADIENT_RADIAL':
    case 'GRADIENT_DIAMOND':
    case 'GRADIENT_ANGULAR':
      return Math.random().toString();
  }
}

function composeVariableFillId(
  fill: WorldviewPaint,
  inspected: { type: 'VALUE'; value: WorldviewPaint },
  theme: EmanationSDKTheme
) {
  let id = '';
  switch (fill.type) {
    case 'SOLID':
      id = hashPaint(inspected.value);
      if (!(id in theme.colors)) {
        theme.colors[id] = fill;
      }
      break;
    case 'IMAGE':
      id = hashPaint(inspected.value);
      if (!(id in theme.images)) {
        theme.images[id] = {
          type: 'PREPROCESSED',
          value: fill,
        };
      }
      break;
    case 'GRADIENT_LINEAR':
    case 'GRADIENT_RADIAL':
    case 'GRADIENT_DIAMOND':
    case 'GRADIENT_ANGULAR':
      id = hashPaint(inspected.value);
      if (!(id in theme.gradients)) {
        theme.gradients[id] = fill;
      }
      break;
  }
  return id;
}

function mutateInPlaceFillToVariable(
  worldview: WorldviewNode,
  theme: EmanationSDKTheme
): boolean {
  if (!('fill' in worldview) || worldview.fill === undefined) return false;
  const inspected = inspectValue(worldview.fill);
  if (inspected.type !== 'VALUE') {
    throw new Error('Internal error');
  }
  const fill = inspected.value;
  // MIXED_PAINT
  if (fill.type === 'MIXED_PAINT') {
    const values: Array<
      | VariableValue<WorldviewSinglePaint>
      | ConstantValue<WorldviewSinglePaint>
      | WorldviewSinglePaint
    > = [];
    for (const paint of fill.values) {
      // INCLUDE Wrapped
      if (paint.type === 'VARIABLE' || paint.type == 'CONSTANT') {
        values.push(paint);
      } else {
        // Wrap and include
        const id = composeVariableFillId(
          paint,
          { type: 'VALUE', value: paint },
          theme
        );
        values.push({
          type: 'VARIABLE',
          id,
          fallback: paint,
        });
      }
    }
    worldview.fill = {
      type: 'MIXED_PAINT',
      values,
    };
    return true;
  }
  // regular fill
  let id = composeVariableFillId(fill, inspected, theme);
  worldview.fill = {
    type: 'VARIABLE',
    id,
    fallback: fill,
  };
  return true;
}

function mutateInPlaceStrokeToVariable(
  worldview: WorldviewNode,
  theme: EmanationSDKTheme
): boolean {
  if (!('stroke' in worldview) || worldview.stroke === undefined) return false;
  const inspected = inspectValue(worldview.stroke);
  if (inspected.type !== 'VALUE') {
    throw new Error('Internal error');
  }
  const stroke = inspected.value;
  const id = hashPaint(inspected.value);
  if (!(id in theme.colors)) {
    theme.colors[id] = stroke;
  }
  worldview.stroke = {
    type: 'VARIABLE',
    id,
    fallback: stroke,
  };
  return true;
}

function mutateInPlaceCharactersToVariable(
  worldview: WorldviewNode,
  theme: EmanationSDKTheme
): boolean {
  if (!('characters' in worldview) || worldview.characters === undefined)
    return false;
  const inspected = inspectValue(worldview.characters);
  if (inspected.type !== 'VALUE') {
    throw new Error('Internal error');
  }
  const characters = inspected.value;
  if (!(characters in theme.characters)) {
    theme.characters[characters] = characters;
  }
  worldview.characters = {
    type: 'VARIABLE',
    id: characters,
    fallback: characters,
  };
  return true;
}

function mutateInPlaceWorldviewContainerNodeAndTheme(
  worldview: WorldviewNode,
  theme: EmanationSDKTheme
): void {
  mutateInPlaceFillToVariable(worldview, theme);
  mutateInPlaceStrokeToVariable(worldview, theme);
  mutateInPlaceCharactersToVariable(worldview, theme);

  switch (worldview.type) {
    case 'CONTAINER':
      if (worldview.children !== null) {
        for (const child of worldview.children) {
          mutateInPlaceWorldviewContainerNodeAndTheme(child, theme);
        }
      }
      break;
  }
}

function extractEmanationSDKScreen(root: WorldviewNode): EmanationSDKScreen {
  const theme: EmanationSDKTheme = {
    colors: {}, // Color references
    images: {}, // Image references
    icons: {}, // Icon references
    characters: {}, // Characters (text) references
    gradients: {}, // Gradients
  };

  const deepCopy: WorldviewNode = JSON.parse(JSON.stringify(root));
  mutateInPlaceWorldviewContainerNodeAndTheme(deepCopy, theme);

  return {
    meta: {
      theme,
    },
    name: root.name,
    description: 'TODO', // TODO: A screen *could* have a description using a - separator ...
    root: deepCopy,
  };
}

export async function extractEmanationSDKEpochAndAssetsFromSelection(): Promise<EmanationSDKEpoch | null> {
  if (
    figma.currentPage.selection.length !== 1 ||
    figma.currentPage.selection[0].type !== 'SECTION'
  ) {
    notify('Ensure you selected a section and try again');
    return null;
  }

  if (figma.currentPage.selection[0].name.split(' - ').length !== 2) {
    notify(`Ensure sections are titled: "Name - Description" and try again`);
    return null;
  }
  const [name, description] = figma.currentPage.selection[0].name.split(' - ');

  const sortedChildren = figma.currentPage.selection[0].children
    .slice()
    .sort((a, b) => {
      if (a.y !== b.y) {
        return a.y - b.y;
      } else {
        return a.x - b.x;
      }
    });
  const roots: WorldviewNode[] = [];
  for (const child of sortedChildren) {
    switch (child.type) {
      case 'FRAME':
      case 'COMPONENT':
      case 'COMPONENT_SET':
      case 'INSTANCE': {
        const root = await extractWorldviewContainerNode(child);
        if (root === null) {
          return null;
        }
        roots.push(root);
        break;
      }
      case 'BOOLEAN_OPERATION':
        const root = await extractWorldviewBooleanOperationNode(child);
        if (root === null) {
          return null;
        }
        roots.push(root);
        break;
    }
  }

  // Convert roots to screens
  const screens: EmanationSDKScreen[] = [];
  for (const root of roots) {
    screens.push(extractEmanationSDKScreen(root));
  }

  return {
    name: '' + Date.now(),
    apps: [
      {
        meta: {},

        name,
        description,
        screens,
      },
    ],
  };
}

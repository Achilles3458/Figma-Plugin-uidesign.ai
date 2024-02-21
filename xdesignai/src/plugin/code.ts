import { drawScreens } from '@emanation/pacific';
import { traverseLayers } from '../app/functions/traverse-layers';
import { createStyleGuide } from './create-style-guide';
import {
  EmanationSDKAssets,
  EmanationSDKTheme,
  EmanationSDKScreen,
  inspectValue,
  WorldviewContainerNode,
  WorldviewNode,
  WorldviewPaint,
} from './types';
import { extractWorldviewContainerNode, extractWorldviewGroupNode } from './worldview';

// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
  width: 400,
  height: 250,
  title: 'uidesign.ai',
  themeColors: true,
});

let availableFonts: any[] = [];

/**********************************************************************/
/******************* Html to Figma *************************/
/**********************************************************************/

const defaultFont = { family: 'Roboto', style: 'Regular' };
const fontCache: { [key: string]: FontName | undefined } = {};
type AnyStringMap = { [key: string]: any };

function assign(a: BaseNode & AnyStringMap, b: AnyStringMap) {
  for (const key in b) {
    const value = b[key];
    if (key === 'data' && value && typeof value === 'object') {
      const currentData = JSON.parse(a.getSharedPluginData('uxdesign', 'data') || '{}') || {};
      const newData = value;
      const mergedData = Object.assign({}, currentData, newData);
      // TODO merge plugin data
      a.setSharedPluginData('uxdesign', 'data', JSON.stringify(mergedData));
    } else if (
      typeof value != 'undefined' &&
      ['width', 'height', 'type', 'ref', 'children', 'svg'].indexOf(key) === -1
    ) {
      try {
        a[key] = b[key];
      } catch (err) {
        // console.warn(`Assign error for property "${key}"`, a, b, err);
      }
    }
  }
}

function getImageFills(layer: RectangleNode | TextNode) {
  const images = Array.isArray(layer.fills) && layer.fills.filter((item) => item.type === 'IMAGE');
  return images;
}

async function processImages(layer: RectangleNode | TextNode) {
  const images = getImageFills(layer);
  return (
    images &&
    Promise.all(
      images.map(async (image: any) => {
        if (image?.intArr) {
          image.imageHash = await figma.createImage(image.intArr).hash;
          delete image.intArr;
          delete image.alt;
          delete image.width;
          delete image.height;
          delete image.url;
        }
      })
    )
  );
}

const normalizeName = (str: string) => str.toLowerCase().replace(/[^a-z]/gi, '');

// TODO: keep list of fonts not found
async function getMatchingFont(fontStr: string, availableFonts: Font[]) {
  const familySplit = fontStr.split(/\s*,\s*/);

  for (const family of familySplit) {
    const normalized = normalizeName(family);
    for (const availableFont of availableFonts) {
      const normalizedAvailable = normalizeName(availableFont.fontName.family);
      if (normalizedAvailable === normalized) {
        const cached = fontCache[normalizedAvailable];
        if (cached) {
          return cached;
        }
        await figma.loadFontAsync(availableFont.fontName);
        fontCache[fontStr] = availableFont.fontName;
        fontCache[normalizedAvailable] = availableFont.fontName;
        return availableFont.fontName;
      }
    }
  }

  return defaultFont;
}

function createMainContainer() {
  const pageContainerName = `UIDesign.AI`;
  let pageContainer: FrameNode = figma.currentPage.findOne((node) => node.name === pageContainerName) as FrameNode;
  if (!pageContainer) {
    pageContainer = figma.createFrame();
    pageContainer.name = pageContainerName;
    pageContainer.fills = [];
    pageContainer.layoutMode = 'VERTICAL';
    pageContainer.counterAxisSizingMode = 'AUTO';
    pageContainer.itemSpacing = 30;
  }
  return pageContainer;
}

/**********************************************************************/
/******************* Extra Figma Selection *************************/
/**********************************************************************/

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

function mutateInPlaceFillToVariable(worldview: WorldviewNode, theme: EmanationSDKTheme): boolean {
  if (!('fill' in worldview) || worldview.fill === undefined) return false;
  const inspected = inspectValue(worldview.fill);
  if (inspected.type !== 'VALUE') {
    throw new Error('Internal error');
  }
  const fill = inspected.value;
  let id: string;
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
  worldview.fill = {
    type: 'VARIABLE',
    id,
    fallback: fill,
  };
  return true;
}

function mutateInPlaceStrokeToVariable(worldview: WorldviewNode, theme: EmanationSDKTheme): boolean {
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

function mutateInPlaceCharactersToVariable(worldview: WorldviewNode, theme: EmanationSDKTheme): boolean {
  if (!('characters' in worldview) || worldview.characters === undefined) return false;
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

function mutateInPlaceWorldviewContainerNodeAndTheme(worldview: WorldviewNode, theme: EmanationSDKTheme): void {
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

  const deepCopy: WorldviewContainerNode = JSON.parse(JSON.stringify(root));
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

async function extractUpdateFrameFromSelection(): Promise<EmanationSDKScreen> {
  const frameNode = figma.currentPage.selection[0] as FrameNode;

  const root = await extractWorldviewContainerNode(frameNode);
  if (root === null) {
    return null;
  }

  // Convert roots to screens
  const screen: EmanationSDKScreen = extractEmanationSDKScreen(root);

  return screen;
}

async function extraScreensFromSelection(): Promise<EmanationSDKScreen[]> {
  const sectionNode = figma.currentPage.selection[0] as SectionNode;

  const sortedChildren = sectionNode.children.slice().sort((a, b) => {
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
      case 'GROUP':
      case 'INSTANCE': {
        if (child.type === 'FRAME') {
          const root = await extractWorldviewContainerNode(child);
          if (root === null) {
            return null;
          }
          roots.push(root);
          break;
        } else {
          const root = await extractWorldviewGroupNode(child);
          if (root === null) {
            return null;
          }
          roots.push(root);
        }
      }
    }
  }

  // Convert roots to screens
  const screens: EmanationSDKScreen[] = [];

  for (const root of roots) {
    screens.push(extractEmanationSDKScreen(root));
  }
  return screens;
}

async function extractAssetsFromScreens(screens: EmanationSDKScreen[]): Promise<EmanationSDKAssets> {
  const assets: EmanationSDKAssets = {};

  for (const screen of screens) {
    for (const key in screen.meta.theme.images) {
      const value = screen.meta.theme.images[key];

      switch (value.type) {
        case 'PREPROCESSED': {
          const image = figma.getImageByHash(value.value.imageHash);
          if (image === null) {
            throw new Error('Internal error');
          }
          const bytes = await image.getBytesAsync();
          if (!(key in assets)) {
            assets[key] = [...bytes];
          }
          break;
        }
        case 'POSTPROCESSED': {
          const image = await figma.createImageAsync(value.value.url);
          if (image === null) {
            throw new Error('Internal error - image src');
          }
          const bytes = await image.getBytesAsync();
          if (!(key in assets)) {
            assets[key] = [...bytes];
          }
          break;
        }
      }
    }
  }
  return assets;
}

/**********************************************************************/
/******************* Figma Plugin Transaction *************************/
/**********************************************************************/

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.

figma.ui.onmessage = async (msg) => {
  const SETTING_KEY = 'uidesign-settings';
  const VERIFY_KEY = 'uidesign-tokens';

  switch (msg.type) {
    case 'INIT_REQUEST':
      const settings = (await figma.clientStorage.getAsync(SETTING_KEY)) || {};
      const token = (await figma.clientStorage.getAsync(VERIFY_KEY)) || {};
      figma.ui.postMessage({ type: 'INIT_REQUEST', settings, token });
      break;
    case 'VERIFIED':
      await figma.clientStorage.setAsync(VERIFY_KEY, msg.token);
      break;
    case 'RESET':
      await figma.clientStorage.deleteAsync(SETTING_KEY);
      await figma.clientStorage.deleteAsync(VERIFY_KEY);
      figma.ui.postMessage({ type: 'RESET' });
      break;
    case 'SAVE_SETTINGS':
      await figma.clientStorage.setAsync(SETTING_KEY, msg.settings);
      break;
    case 'GET_SELECTION':
      let hasSectionSelection = false;
      if (figma.currentPage.selection.length !== 1 || figma.currentPage.selection[0].type !== 'SECTION') {
        hasSectionSelection = false;
        break;
      }

      const selectedSectionTitle = figma.currentPage.selection[0].name.split(' - ');
      if (selectedSectionTitle.length !== 2) {
        hasSectionSelection = false;
        break;
      }
      hasSectionSelection = true;

      const selectedSectionScreens = await extraScreensFromSelection();
      if (selectedSectionScreens === null) {
        return;
      }
      const selectedSectionAssets = await extractAssetsFromScreens(selectedSectionScreens);
      figma.ui.postMessage({
        type: 'GET_SELECTION',
        hasSelection: hasSectionSelection,
        sectionTitle: selectedSectionTitle,
        assets: selectedSectionAssets,
        screens: selectedSectionScreens,
      });
      break;
    case 'UPDATE_FRAME_SELECTION':
      if (figma.currentPage.selection.length !== 1 || figma.currentPage.selection[0].type !== 'FRAME') {
        figma.ui.postMessage({
          type: 'UPDATE_FRAME_SELECTION',
          hasSelection: false,
        });
        break;
      }

      const screen = await extractUpdateFrameFromSelection();
      if (screen === null) {
        figma.ui.postMessage({
          type: 'UPDATE_FRAME_SELECTION',
          hasSelection: false,
        });
        break;
      }

      const assets = await extractAssetsFromScreens([screen]);
      figma.ui.postMessage({
        type: 'UPDATE_FRAME_SELECTION',
        hasSelection: true,
        assets,
        screen,
        promptText: msg.promptText,
        feature: msg.feature,
      });
      break;
    case 'IMPORT_SITE_STREAM':
      const pageContainer = createMainContainer();

      const streamContainerName = msg.promptText;
      const container = pageContainer.findOne((node) => node.name === streamContainerName) || figma.createFrame();
      container.name = streamContainerName;
      if (!pageContainer.children.includes(container)) {
        pageContainer.appendChild(container);
      }

      const sectionName = `${msg.breakpoint}px`;

      if (msg.done) {
        const frameRoot = pageContainer.findOne((x) => x.name === sectionName) as FrameNode;

        if (frameRoot) {
          for (let i = 0; i < frameRoot.children.length - 1; i++) {
            frameRoot.children[i].remove();
          }
        }

        // Create a style guide if there's none
        if (container && container.type === 'FRAME') {
          if (!container.children.find((node) => node.name === 'Style Guide')) {
            const styleGuide = await createStyleGuide(container, frameRoot);
            container.appendChild(styleGuide);
          }
        }

        figma.ui.postMessage({
          type: 'import-done',
          rootId: frameRoot.id,
        });
      } else {
        let frameRoot;
        const mainFrame = pageContainer.findOne((x) => x.name === sectionName) as FrameNode;
        if (mainFrame) {
          frameRoot = mainFrame;
          if (mainFrame.children.length > 1) {
            for (let i = 0; i < mainFrame.children.length - 1; i++) mainFrame.children[i].remove();
          }
        } else {
          frameRoot = figma.createFrame();
          frameRoot.name = sectionName;
        }

        if (container.type === 'FRAME') {
          container.fills = [];
          container.layoutMode = 'HORIZONTAL';
          container.counterAxisSizingMode = 'AUTO';
          container.itemSpacing = 24;

          if (!container.children.includes(frameRoot)) {
            container.appendChild(frameRoot);
          }
        }

        if (availableFonts.length === 0) {
          availableFonts = (await figma.listAvailableFontsAsync()).filter((font) => font.fontName.style === 'Regular');
        }
        const cached = fontCache[defaultFont.family];
        if (!cached) await figma.loadFontAsync(defaultFont);

        const { data } = msg;
        const { layers } = data;

        const rects: SceneNode[] = [];

        for (const rootLayer of layers) {
          await traverseLayers(rootLayer, async (layer: any, parent) => {
            try {
              if (layer.type === 'FRAME' || layer.type === 'GROUP') {
                const frame = figma.createFrame();
                frame.x = layer.x;
                frame.y = layer.y;
                frame.resize(layer.width || 1, layer.height || 1);
                assign(frame, layer);
                ((parent && (parent as any).ref) || frameRoot).appendChild(frame);
                layer.ref = frame;
                rects.push(frame);
                if (!parent) {
                  // frameRoot = frame;
                  frameRoot.resize(frame.width, frame.height);
                }
              } else if (layer.type === 'SVG') {
                const node = figma.createNodeFromSvg(layer.svg);
                node.x = layer.x;
                node.y = layer.y;
                node.resize(layer.width || 1, layer.height || 1);
                layer.ref = node;
                rects.push(node);
                assign(node, layer);
                ((parent && (parent as any).ref) || frameRoot).appendChild(node);
              } else if (layer.type === 'RECTANGLE') {
                const rect = figma.createRectangle();
                const imageFills = getImageFills(layer);

                if (imageFills && imageFills.length) {
                  await processImages(layer);
                  if (msg.blurImages) {
                    (layer as RectangleNode).effects = [
                      {
                        type: 'LAYER_BLUR',
                        visible: true,
                        radius: 13,
                      },
                    ];
                    (layer as RectangleNode).name = 'Example Image';
                  }
                }
                assign(rect, layer);
                rect.resize(layer.width || 1, layer.height || 1);
                rects.push(rect);
                layer.ref = rect;
                ((parent && (parent as any).ref) || frameRoot).appendChild(rect);
              } else if (layer.type == 'TEXT') {
                const text = figma.createText();
                if (layer.fontFamily) {
                  const cached = fontCache[layer.fontFamily];
                  if (cached) {
                    text.fontName = cached;
                  } else {
                    const family = await getMatchingFont(layer.fontFamily || '', availableFonts);
                    text.fontName = family;
                  }
                  delete layer.fontFamily;
                }
                assign(text, layer);
                layer.ref = text;
                text.resize(layer.width || 1, layer.height || 1);
                text.textAutoResize = 'HEIGHT';
                const lineHeight = (layer.lineHeight && layer.lineHeight.value) || layer.height;
                let adjustments = 0;
                while (
                  typeof text.fontSize === 'number' &&
                  typeof layer.fontSize === 'number' &&
                  (text.height > Math.max(layer.height, lineHeight) * 1.2 || text.width > layer.width * 1.2)
                ) {
                  // Don't allow changing more than ~30%
                  if (adjustments++ > layer.fontSize * 0.3) {
                    // console.warn('Too many font adjustments', text, layer);
                    break;
                  }
                  try {
                    text.fontSize = text.fontSize - 1;
                  } catch (err) {
                    // console.warn('Error on resize text:', layer, text, err);
                  }
                }
                if (layer.truncation !== undefined) text.textTruncation = layer.truncation;
                rects.push(text);
                ((parent && (parent as any).ref) || frameRoot).appendChild(text);
              }
            } catch (err) {
              // console.warn('Error on layer:', layer, err);
            }
          });
        }
        if (frameRoot.type === 'FRAME') {
          figma.currentPage.selection = [container];
        }

        figma.ui.postMessage({
          type: 'import-stream-done',
          rootId: frameRoot.id,
        });

        figma.viewport.scrollAndZoomIntoView([container]);
      }
      break;
    case 'DRAW_SCREENS': {
      if (msg.redraw === true) {
        figma.currentPage.selection[0].remove();
      }
      const handler = figma.notify(`Generating ${JSON.stringify(msg.prompt)}`, { timeout: Number.POSITIVE_INFINITY });
      await drawScreens(msg.payload, { timeout: 50 });
      handler.cancel();
      figma.notify(`Generated ${JSON.stringify(msg.prompt)}!`);
      figma.ui.postMessage({ type: 'DRAW_SCREENS' });
      break;
    }
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen./
  // figma.closePlugin();
};

import { getBoundingClientRect } from './helpers/dimensions';
import { getImagePaintWithUrl } from './helpers/image';
import { isHidden, textNodesUnder, traverse } from './helpers/nodes';
import { getRgb } from './helpers/parsers';
import {
  addStrokesFromBorder,
  getStrokesRectangle,
  // getAppliedComputedStyles,
  getShadowEffects,
  getBorderRadii,
} from './helpers/styles';
import { createSvgLayer, processSvgUseElements } from './helpers/svg';
import { buildTextNode } from './helpers/text';
import { getLayersForFrames } from './helpers/frames';
import { LayerNode, WithRef } from './types/nodes';

const generateElements = (el: Element) => {
  const getShadowEls = (el: Element): Element[] =>
    Array.from(el.shadowRoot?.querySelectorAll('*') || []).reduce(
      (memo, el) => [...memo, el, ...getShadowEls(el)],
      [] as Element[]
    );

  const els = Array.from(el.querySelectorAll('*')).reduce(
    (memo, el) => [...memo, el, ...getShadowEls(el)],
    [] as Element[]
  );
  return els;
};

function removeRefs({ layers, root }: { layers: LayerNode[]; root: WithRef<FrameNode> }) {
  layers.concat([root]).forEach((layer) => {
    traverse(layer, (child) => {
      delete child.ref;
    });
  });
}

let imageLayers: {[key: string]: any} = {};

const getLayersForElement = (myWindow: Window, el: Element, postImage: boolean = true) => {
  const { getComputedStyle } = myWindow;

  const elementLayers: LayerNode[] = [];
  if (isHidden(myWindow, el)) {
    return [];
  }
  if (el instanceof SVGSVGElement || el.tagName.toLowerCase() === 'svg') {
    elementLayers.push(createSvgLayer(el as SVGSVGElement));
    return elementLayers;
  }
  // Sub SVG Element
  else if (
    el instanceof SVGElement ||
    el.tagName.toLowerCase() === 'circle' ||
    el.tagName.toLowerCase() === 'clippath' ||
    el.tagName.toLowerCase() === 'ellipse' ||
    el.tagName.toLowerCase() === 'rect' ||
    el.tagName.toLowerCase() === 'path'
  ) {
    return [];
  }

  // for `picture`, we only need the `image` element. We can ignore the parent `picture` and
  // `source` sibling elements.
  if (
    (el.parentElement instanceof HTMLPictureElement && el instanceof HTMLSourceElement) ||
    (el.parentElement.tagName.toLowerCase() === 'picture' && el.tagName.toLowerCase() === 'source') ||
    el instanceof HTMLPictureElement ||
    el.tagName.toLowerCase() === 'picture'
  ) {
    return [];
  }

  // TO-DO: what does `appliedStyles` do here? All we do is check that it's non-empty
  // const appliedStyles = getAppliedComputedStyles(myWindow, el);

  const computedStyle = getComputedStyle(el);

  const styleAvailable = true; // Object.keys(appliedStyles).length || el instanceof HTMLImageElement || el instanceof HTMLVideoElement;
  const visible = computedStyle.display !== 'none';

  if (styleAvailable && visible) {
    const rect = getBoundingClientRect(myWindow, el);

    if (rect.width >= 1 && rect.height >= 1) {
      let fills: Paint[] = [];

      const color = getRgb(computedStyle.backgroundColor);

      if (color) {
        const solidPaint: SolidPaint = {
          type: 'SOLID',
          color: {
            r: color.r,
            g: color.g,
            b: color.b,
          },
          opacity: color.a || 1,
        };
        fills.push(solidPaint);
      }

      const imagePaint = getImagePaintWithUrl({ computedStyle, el });
      let publishFlag = false;
      if (imagePaint) {
        const imageKey = imagePaint.url + ':' + imagePaint.alt;
        publishFlag = postImage || !!imageLayers[imageKey];

        if (publishFlag) {
          fills.push(imagePaint);
          (el as HTMLElement).setAttribute("style",`display:block;width:${imagePaint.width}px;height:${imagePaint.height}px;`);
        }
      }
      if (!publishFlag && imagePaint) {
        const imageKey = imagePaint.url + ':' + imagePaint.alt;
        imageLayers[imageKey] = true;
        const solidPaint: SolidPaint = {
          type: 'SOLID',
          color: {
            r: 128 / 255,
            g: 128 / 255,
            b: 128 / 255,
          },
          opacity: 1,
        };
        fills = [solidPaint];
        (el as HTMLElement).setAttribute("style",`display:block;width:${imagePaint.width}px;height:${imagePaint.height}px;background-color:darkgray;`);
      }

      const rectNode: WithRef<RectangleNode> = {
        type: 'RECTANGLE',
        ref: el,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: imagePaint ? Math.round(imagePaint.width) : Math.round(rect.width),
        height: imagePaint ? Math.round(imagePaint.height) : Math.round(rect.height),
        fills,
      };

      if (publishFlag && imagePaint) {
        rectNode.name = 'IMAGE';
      }

      const strokes = addStrokesFromBorder({ computedStyle });

      if (strokes) {
        Object.assign(rectNode, strokes);
      }

      if (!rectNode.strokes) {
        for (const dir of ['top', 'left', 'right', 'bottom'] as const) {
          const strokesLayer = getStrokesRectangle({
            dir,
            rect,
            computedStyle,
            el,
          });

          if (strokesLayer) {
            elementLayers.push(strokesLayer);
          }
        }
      }
      const shadowEffects = getShadowEffects({ computedStyle });

      if (shadowEffects) {
        rectNode.effects = shadowEffects;
      }

      const borderRadii = getBorderRadii({ computedStyle });
      Object.assign(rectNode, borderRadii);

      elementLayers.push(rectNode);
    }
  }

  return elementLayers;
};

export function htmlToFigma(myWindow: Window, selector: string = 'body', useFrames: boolean = false, postImage: boolean = true) {
  const layers: LayerNode[] = [];
  const el: HTMLElement = myWindow.document.querySelector(selector || 'body');

  if (el) {
    processSvgUseElements(myWindow.document, el);

    const els = generateElements(el);

    els.forEach((el) => {
      const elLayers = getLayersForElement(myWindow, el, postImage);
      layers.push(...elLayers);
    });

    const textNodes = textNodesUnder(myWindow.document, el);

    for (const node of textNodes) {
      const textNode = buildTextNode(myWindow, { node });
      if (textNode) {
        layers.push(textNode);
      }
    }
  }

  const FRAME_WIDTH = myWindow.innerWidth; // myWindow.document.documentElement.scrollWidth;
  const FRAME_HEIGHT =
    Math.round(myWindow.document.documentElement.scrollHeight) > 800
      ? Math.round(myWindow.document.documentElement.scrollHeight)
      : 800;

  // TODO: send frame: { children: []}
  const root: WithRef<FrameNode> = {
    type: 'FRAME',
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    x: 0,
    y: 0,
    ref: myWindow.document.body,
  };

  layers.unshift(root);

  const framesLayers = useFrames ? getLayersForFrames(myWindow, { layers, root }) : layers;

  removeRefs({ layers: framesLayers, root });

  return framesLayers;
}

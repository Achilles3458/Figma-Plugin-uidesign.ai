import { getAttributes } from '../../../utils';

interface ImagePaintWithUrl extends ImagePaint {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export const getImagePaintWithUrl = ({
  computedStyle,
  el,
}: {
  computedStyle: CSSStyleDeclaration;
  el: Element;
}): ImagePaintWithUrl | undefined => {
  if (el instanceof SVGSVGElement || el.tagName.toLowerCase() === 'svg') {
    const svgEl = el as SVGSVGElement;

    const url = `data:image/svg+xml,${encodeURIComponent(svgEl.outerHTML.replace(/\s+/g, ' '))}`;
    return {
      url,
      type: 'IMAGE',
      // TODO: object fit, position
      scaleMode: 'FILL',
      imageHash: null,
    };
  } else {
    const baseImagePaint: ImagePaint = {
      type: 'IMAGE',
      // TODO: object fit, position
      scaleMode: 'FILL', // computedStyle.objectFit === 'contain' ? 'FIT' : 'FILL',
      imageHash: null,
    };

    if (el instanceof HTMLImageElement || el.tagName.toLowerCase() === 'img') {
      // we use `currentSrc` instead of `src` as that will be the accurate value in dynamic contexts:
      // when the img is a child of a picture element, or it has `sizes`/`srcSet` attributes, etc.
      const imgEl = el as HTMLImageElement;

      // let url;
      // if (imgEl.src) url = imgEl.src;
      // else if (imgEl.currentSrc) url = imgEl.currentSrc;
      // else if (imgEl.srcset) {
      //   let highestDensity = 0;
      //   let highestSrc = '';
      //   for (var descriptor of imgEl.srcset.split(/,/)) {
      //     var parts = descriptor.trim().split(/ /);
      //     var pixelDensity = Number(parts[parts.length - 1].match(/\d+/)[0]);
      //     if (pixelDensity > highestDensity) {
      //       highestSrc = parts[0];
      //       highestDensity = pixelDensity;
      //     }
      //   }
      //   url = highestSrc;
      // }

      const attrs = getAttributes(imgEl);

      if (attrs.src || attrs.alt)
        return {
          url: attrs.src,
          alt: attrs.alt,
          width: attrs.width || 256,
          height: attrs.height || 256,
          ...baseImagePaint,
        };
    } else if (el instanceof HTMLVideoElement || el.tagName.toLowerCase() === 'video') {
      const videoEl = el as HTMLVideoElement;
      const url = videoEl.poster;
      if (url) {
        return {
          url,
          ...baseImagePaint,
        };
      }
    }
  }

  // can this be true _and_ one of the previous IFs?
  // i.e. could an element have a computed bg image and be an SVG/img/picture/video element?
  // probably not, we can likely avoid returning this fill _and_ the previous ones.
  // TO-DO: what happens if this is in the fills array, along with something else e.g. an img?
  if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
    const urlMatch = computedStyle.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
    const url = urlMatch?.[1];
    if (url) {
      return {
        url,
        type: 'IMAGE',
        // TODO: background size, position
        scaleMode: computedStyle.backgroundSize === 'contain' ? 'FIT' : 'FILL',
        imageHash: null,
      };
    }
  }

  return null;
};

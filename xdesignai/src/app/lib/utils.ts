import * as fileType from 'file-type';
// import { createApi } from 'unsplash-js';
import { BASE64_MARKER } from '../constants';
// import { BASE64_MARKER, UNSPLASH_ACCESS_KEY } from '../constants';
import { transformWebpToPNG } from '../functions/encode-images';

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

function convertDataURIToBinary(dataURI: string) {
  const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  const base64 = dataURI.substring(base64Index);
  const raw = window.atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

export function getImageFills(layer: RectangleNode | TextNode) {
  const images =
    Array.isArray(layer.fills) &&
    layer.fills
      .filter((item) => item.type === 'IMAGE' && item.visible !== false && item.opacity !== 0)
      .sort((a, b) => b.opacity - a.opacity);
  return images;
}

let imageCache: { [key: string]: Uint8Array | string | undefined } = {};

export async function processImages(layer: RectangleNode | TextNode, base_url: string = '') {
  const images = getImageFills(layer);

  if (!images) {
    return;
  }

  const convertToSvg = (value: string) => {
    (layer as any).type = 'SVG';
    (layer as any).svg = value;
    if (typeof layer.fills !== 'symbol') {
      layer.fills = layer.fills.filter((item) => item.type !== 'IMAGE');
    }
  };

  type AugmentedImagePaint = Writeable<ImagePaint> & {
    intArr?: Uint8Array;
    url?: string;
    alt?: string;
    width?: number;
    height?: number;
  };

  for (let i = 0; i < images.length; i++) {
    let image = images[i] as AugmentedImagePaint;

    if (!image || (!image.url && !image.alt)) continue;

    if (imageCache[image.url + ':' + image.alt]) {
      image.intArr = imageCache[image.url + ':' + image.alt] as Uint8Array;
      continue;
    }

    try {
      let url = image.url;
      if (url.startsWith('data:')) {
        const type = url.split(/[:,;]/)[1];
        if (type.includes('svg')) {
          const svgValue = decodeURIComponent(url.split(',')[1]);
          convertToSvg(svgValue);
          imageCache['svg: ' + image.url + ':' + image.alt] = svgValue;
        } else if (url.includes(BASE64_MARKER)) {
          image.intArr = convertDataURIToBinary(url);
          imageCache[image.url + ':' + image.alt] = image.intArr;
        } else {
          // console.info("Found data url that could not be converted", url);
        }
      } else {
        let validUrl = url.startsWith('http://') || url.startsWith('https://');
        if (base_url && !validUrl) {
          url = base_url + '/' + url;
          validUrl = true;
        }

        let res = null;
        try {
          if (!validUrl) throw new Error('no url');
          res = await fetch(`https://uidesign-cors-anywhere.herokuapp.com/${url}`, {
            headers: { origin: 'http://localhost' },
          });
        } catch (e) {}

        // if (!res) {
        //   try {
        //     const unsplash = createApi({
        //       accessKey: UNSPLASH_ACCESS_KEY,
        //     });
        //     const alt = image.alt || 'placeholder image';
        //     const resp: any = await unsplash.search.getPhotos({ query: alt });
        //     if (!resp || !resp.response || !resp.response.results || resp.response.results.length == 0)
        //       throw new Error('could not get photos');
        //     const imageIndex = Math.floor(Math.random() * resp.response.results.length) + 1;
        //     const imageUrl = resp.response.results[imageIndex].urls.raw + `&w=${image.width}&dpr=${image.height}`;

        //     res = await fetch(`https://uidesign-cors-anywhere.herokuapp.com/${imageUrl}`, {
        //       headers: { origin: 'http://localhost' },
        //     });
        //   } catch (e) {}
        // }

        if (!res) continue;

        const contentType = res.headers.get('content-type');
        const isSvg = url.endsWith('.svg');
        if (isSvg || contentType?.includes('svg')) {
          const text = await res.text();
          convertToSvg(text);
          imageCache['svg: ' + image.url + ':' + image.alt] = text;
        } else {
          const arrayBuffer = await res.arrayBuffer();
          const type = fileType(arrayBuffer);
          if (type && (type.ext.includes('svg') || type.mime.includes('svg'))) {
            const text = await res.text();
            convertToSvg(text);
            imageCache['svg: ' + image.url + ':' + image.alt] = text;
          } else {
            const intArr = new Uint8Array(arrayBuffer);

            if (type && (type.ext.includes('webp') || type.mime.includes('image/webp'))) {
              const pngArr = await transformWebpToPNG(intArr);
              image.intArr = pngArr;
            } else {
              image.intArr = intArr;
            }
            imageCache[image.url + ':' + image.alt] = image.intArr;
          }
        }
      }
    } catch (err) {
      // console.warn("Could not fetch image", layer, err);
    }
  }
}

import * as z from 'zod';
import { PostMessageToFigma, postMessageToReact } from '../message_passing';
import { extractEmanationSDKAssetsFromEpoch } from './assets';
import mockEcommerce from './data/mock-ecommerce.json';
import mockFinance from './data/mock-finance.json';
import mockSocialMedia from './data/mock-social-media.json';
import mockTest from './data/mock-test.json';
import { drawRoots, drawScreens, setReactions } from './draw';
import { notify, notifyError } from './notify';
import { extractEmanationSDKEpochAndAssetsFromSelection } from './selection';
import { initialSize } from './sizes';
import { sleep } from './sleep';
import { EmanationSDKEpoch, FigmaUser, PromptConfiguration } from './types';

let SETTINGS: PromptConfiguration = {
  temperature: 0.5,
  threshold: 0.5,
  timeout: 50,
};

let CURRENT_USER: FigmaUser = {
  id: '',
  photoURL: '',
  name: '',
};

const CachedSettings = z.object({
  temperature: z.number().min(0).max(1),
  threshold: z.number().min(0).max(1),
  timeout: z.number().min(0).max(500),
});

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

async function init() {
  console.clear();

  //// if (figma.currentPage.selection.length !== 1) {
  //// 	notify("Please select a rectangle")
  //// 	await sleep(1_000)
  //// 	figma.closePlugin()
  //// 	return
  //// }
  //// const sceneNode = figma.currentPage.selection[0]
  //// if (sceneNode.type !== "RECTANGLE") {
  //// 	notify("Please select a rectangle")
  //// 	await sleep(1_000)
  //// 	figma.closePlugin()
  //// 	return
  //// }
  //// const rectangleNode = sceneNode
  //// if (rectangleNode.fills === figma.mixed || rectangleNode.fills.length !== 1) {
  //// 	notify("Please select a rectangle with a single image fill")
  //// 	await sleep(1_000)
  //// 	figma.closePlugin()
  //// 	return
  //// }
  ////
  //// const foo = await rectangleNode.exportAsync({
  //// 	format: "JSON_REST_V1",
  //// })
  //// console.log(JSON.stringify(foo))
  ////
  //// const fills = rectangleNode.fills
  //// if (fills[0].type !== "IMAGE") {
  //// 	notify("Please select a rectangle with a single image fill")
  //// 	await sleep(1_000)
  //// 	figma.closePlugin()
  //// 	return
  //// }
  //// const imagePaint = fills[0]
  //// if (imagePaint.imageHash === null) {
  //// 	notify("Please select a rectangle with a single image fill")
  //// 	await sleep(1_000)
  //// 	figma.closePlugin()
  //// 	return
  //// }
  //// const imageHash = imagePaint.imageHash
  //// //// console.log(imageHash)
  ////
  //// const image = figma.getImageByHash(imageHash)
  //// if (image === null) {
  //// 	notify("Please select a rectangle with a single image fill")
  //// 	await sleep(1_000)
  //// 	figma.closePlugin()
  //// 	return
  //// }
  //// //// const size = await image.getSizeAsync()
  //// //// console.log(size)
  //// const bytes = await image.getBytesAsync()
  //// console.log(JSON.stringify([...bytes]))
  ////
  //// //// const fills = (figma.currentPage.selection[0] as RectangleNode).fills as Paint[]
  //// //// const image = (fills[0] as ImagePaint)
  //// console.log(image.hash)
  //// //// figma.getImageByHash(image.imageHash)

  // https://twitter.com/Steve8708/status/1696937040598741435
  await sleep(1_000);

  // Current user
  if (
    figma.currentUser === null ||
    figma.currentUser.id === null ||
    figma.currentUser.photoUrl === null ||
    figma.currentUser.name === null
  ) {
    notify('Please login to Figma');
    await sleep(1_000);
    figma.closePlugin();
    return;
  }
  CURRENT_USER = {
    id: figma.currentUser.id,
    photoURL: figma.currentUser.photoUrl,
    name: figma.currentUser.name,
  };

  // Settings
  const settings = await figma.clientStorage.getAsync('settings');
  if (settings === undefined) {
    return;
  }
  const result = CachedSettings.safeParse(settings);
  if (!result.success) {
    return;
  }

  postMessageToReact({
    type: 'INIT',
    payload: {
      currentUser: CURRENT_USER,
      temperature: result.data.temperature,
      threshold: result.data.threshold,
      timeout: result.data.timeout,
    },
  });
}

figma.ui.onmessage = async (action: PostMessageToFigma) => {
  switch (action.type) {
    case 'NOTIFY':
      notify(action.payload.message, {
        timeout: action.payload.timeout,
      });
      break;
    case 'NOTIFY_ERROR':
      notifyError(action.payload.message, {
        timeout: action.payload.timeout,
      });
      break;
    case 'CACHE_ALL': {
      SETTINGS = { ...action.payload };
      await figma.clientStorage.setAsync('settings', action.payload);
      break;
    }
    case 'GENERATE_FINANCE_APP':
    case 'GENERATE_SOCIAL_MEDIA_APP':
    case 'GENERATE_ECOMMERCE_APP':
    case 'GENERATE_TEST_APP': {
      let prompt: string;
      let epoch: EmanationSDKEpoch;
      switch (action.type) {
        case 'GENERATE_FINANCE_APP':
          prompt = 'make a finance app';
          epoch = mockFinance as EmanationSDKEpoch;
          break;
        case 'GENERATE_SOCIAL_MEDIA_APP':
          prompt = 'make a social media app';
          epoch = mockSocialMedia as EmanationSDKEpoch;
          break;
        case 'GENERATE_ECOMMERCE_APP':
          prompt = 'make an e-commerce app';
          epoch = mockEcommerce as EmanationSDKEpoch;
          break;
        case 'GENERATE_TEST_APP':
          prompt = 'make a test app';
          epoch = mockTest as EmanationSDKEpoch;
          break;
      }
      figma.viewport.zoom = 0.5;
      notify(`Generating ${JSON.stringify(prompt)}...`, {
        timeout: Number.POSITIVE_INFINITY,
      });
      const roots = epoch.apps[0].screens.map((screen) => screen.root);
      await drawRoots(roots, { timeout: SETTINGS.timeout });
      notify('Generated!');
      break;
    }
    case 'REGENERATE_FROM_SELECTION': {
      figma.viewport.zoom = 0.5;
      notify('Generating...', {
        timeout: Number.POSITIVE_INFINITY,
      });
      const epoch = await extractEmanationSDKEpochAndAssetsFromSelection();
      if (epoch === null) {
        return;
      }
      const roots = epoch.apps[0].screens.map((screen) => screen.root);
      await drawRoots(roots, { timeout: SETTINGS.timeout });
      notify('Generated!');
      break;
    }
    case 'LOG_SELECTION': {
      const epoch = await extractEmanationSDKEpochAndAssetsFromSelection();
      if (epoch === null) {
        return;
      }
      console.log(JSON.stringify(epoch, null, 2));
      notify('Logged to the console');
      break;
    }
    case 'UPLOAD_SELECTION': {
      notify('Uploading selection...', {
        timeout: Number.POSITIVE_INFINITY,
      });
      const epoch = await extractEmanationSDKEpochAndAssetsFromSelection();
      if (epoch === null) {
        return;
      }
      const assets = await extractEmanationSDKAssetsFromEpoch(epoch);
      postMessageToReact({
        type: 'UPLOAD',
        payload: {
          epoch,
          assets,
        },
      });
      break;
    }
    case 'DOWNLOAD':
      figma.viewport.zoom = 0.5;
      // console.log(SETTINGS.timeout)
      //// await EmanationSDK.drawScreens(action.payload, { timeout: SETTINGS.timeout })
      await drawScreens(action.payload, { timeout: SETTINGS.timeout });
      notify('Generated!');
      break;
  }
};

init();
figma.showUI(__html__, {
  themeColors: true,
  title:
    process.env.NODE_ENV === 'development'
      ? `uidesign.ai SDK (NODE_ENV=development)`
      : `uidesign.ai SDK`,
  width: initialSize.width,
  height: initialSize.height,
});

import * as z from 'zod';

export const MAIN_TABS = {
  GENERATE: "Generate",
  UPDATE: "Update",
};

export const GENERATE_FEATURES = [
  {
    label: 'Websites',
    value: "Websites",
  },
  {
    label: 'Mobile Apps',
    value: "Mobile Apps",
  },
  {
    label: 'Slides',
    value: "Slides",
  },
];


export const UPDATE_FEATURES = [
  {
    label: "Characters",
    value: "characters"
  },
  {
    label: "Fonts",
    value: "fonts"
  },
  {
    label: "Colors",
    value: "colors"
  },
  {
    label: "Radiuses",
    value: "radiuses"
  },
  {
    label: "Spacing",
    value: "spacing"
  },
  {
    label: "Gradients",
    value: "gradients"
  },
  {
    label: "Images",
    value: "images"
  },
];

export const PAGES = {
  SIGNUP: 0,
  LOGIN: 1,
  MAIN: 2,
};

export const VIEWS = {
  MAIN: 'Main',
  UPLOAD: 'Upload',
  SETTINGS: 'Settings',
  STYLE_ITEM: 'StyleItem',
  COLOR_PALETTE: 'ColorPalette',
  FONT_PAIRING: 'FontPairing'
};

export const GENERATE_MODES = [
  {
    label: "Generate from projects",
    value: "projects"
  },
  {
    label: "Generate from AI only",
    value: "ai"
  }
];

export const PALETTE_TYPES = [
  {
    label: "Background + Text Colors",
    value: "B+T"
  },
  {
    label: "Background + Gradient + Text Colors",
    value: "B+G+T"
  }
];

export type Color = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

export type GradientStop = {
  color: Color;
  position: number;
};

export type Gradient = {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL";
  gradientStops: GradientStop[];
  gradientTransform?: number[][];
};

export const PAIRING_TYPES = [
  {
    label: "sans_serif+serif",
    value: "ss"
  },
  {
    label: "sans_serif+serif+monospace",
    value: "ssm"
  }
]

export const AI_STYLES = [
  {
    label: 'Default', 
    value: 'default',
  },
  {
    label: 'Tailwind',
    value: 'tailwind'
  }
];

export const AI_MODELS = [
  {
    label: 'gpt-3.5-turbo', 
    value: 'gpt-3.5-turbo',
  },
  {
    label: 'gpt-3.5-turbo-16k',
    value: 'gpt-3.5-turbo-16k'
  },
  {
    label: 'gpt-4',
    value: 'gpt-4'
  }
];

export const UPLOAD_VISIBILITY = [
  {
    label: 'Public', 
    value: true,
  },
  {
    label: 'Private',
    value: false
  },
];

// export const PY_API_HOST = 'http://127.0.0.1:33505';
export const PY_API_HOST = 'https://uidesign-scrape.herokuapp.com';
export const BASE64_MARKER = ';base64,';

export enum PROCESSING_STATUS {
  Init = 0,
  Started = 1,
  No_Html = 2,
  In_Progress = 3,
  Finished = 4,
}

export const STRIPE_URL = 'https://buy.stripe.com/28og0v5c76n59fq3cn';

export const UNSPLASH_ACCESS_KEY = 'pyMM_vlFAz66VaX2cW-Lz92_1qi59WICFN7bm447kYk';

export const validationConstants = {
  EMAIL_VALIDATION_REGEX:
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  PASSWORD_VALIDATION_REGEX: /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/,
  MIN_PASSWORD_LENGTH: 8,
};

export const API_URL = 'https://api.uidesign.ai';
export const STREAM_URL = 'https://app.uidesign.ai/stream';

export const ENDPOINT_UPLOAD_ASSETS = 'https://api.uidesign.ai/gen/v2/assets/images';
// export const ENDPOINT_UPLOAD_EPOCH = 'https://api.uidesign.ai/gen/v2/collections/bravo/';
export const ENDPOINT_UPLOAD_EPOCH = "https://api.uidesign.ai/data/v3/user/figma/collections/";
// export const ENDPOINT_DOWNLOAD_EPOCH = 'https://api.uidesign.ai/gen/v2/design/figma/';
export const ENDPOINT_DOWNLOAD_EPOCH = 'https://api.uidesign.ai/data/v3/generate/figma/app/';
export const ENDPOINT_UPDATE_FRAME = 'https://api.uidesign.ai/data/v3/update/figma/frame/';
export const ENDPOINT_PING = "https://api.uidesign.ai/data/v3/ping";

export const UploadAssetsResponseSchema = z.record(
  z.string(),
  z.object({
    url: z.string(),
    description: z.string(),
  })
);

export const UploadResponseSchema = z.object({
  collection_id: z.string(),
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

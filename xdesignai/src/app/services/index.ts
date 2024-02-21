import { API_URL } from '../constants';

type StyleSet = {
  name: string;
  description: string;
  public: boolean;
  type: string; // use "figma"
  tags?: string[]; // can be omitted
};

type FontData = {
  [key: string]: Array<{
    family: string; // as in css font family
    style?: string; // as in regular, etc
    weight?: number; // should correspond style
    size?: {
      // defines "this font is for text in this size range only"
      min: number;
      max: number;
    };
  }>;
};

type ColorData = {
  [key: string]: Array<{
    background_colors: string[];
    text_colors: string[];
    gradient_colors: string[];
  }>;
};

type ColorPalette = {
  name: string;
  description: string;
  public: boolean;
  tags: string[];
  data: ColorData;
  type: string;
  palette_type: string;
};

type FontFamily = {
  name: string;
  description: string;
  public: boolean;
  tags: string[];
  data: FontData;
  type: string; // use "figma"
  pairing_type: string;
};
type AssetIds = {
  font_family?: string[]; // UUID of existing font
  color_palette?: string[];
  border_radius?: string[];
  color_gradient?: string[];
};

export const getEmbedding = async (id_token: string, body: any) => {
  const response = await fetch(`${API_URL}/v2/user/documents?${body}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${id_token}`,
    },
  });
  if (!response.ok) return null;

  return response.json();
};

export const postEmbedding = async (id_token: string, body: any) => {
  const response = await fetch(`${API_URL}/v2/user/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${id_token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;

  return response.json();
};

export const userStyleList = async (id_token: string) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/style-sets`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${id_token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
};

export const userStyleItem = async (id_token: string, id: string) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/style-sets/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${id_token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
};

export const getStyleSet = async (id_token: string, styleSetId: string) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/style-sets/${styleSetId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${id_token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
};

export const createStyleSet = async (id_token: string, payload: StyleSet) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/style-sets/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      // id_token defined in outer scope
      Authorization: `Bearer ${id_token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
};

export const addStyleSetAssets = async (id_token: string, styleSetId: string, payload: AssetIds) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/style-sets/${styleSetId}/assets/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  // successful if status code is 204 No-Content
  if (response.status !== 204) {
    // handle error
    console.log('failed to set assets');
  }
};

export const removeStyleSetAssets = async (id_token: string, styleSetId: string, payload: AssetIds) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/style-sets/${styleSetId}/assets/`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  // successful if status code is 204 No-Content
  if (response.status !== 204) {
    // handle error
    console.log('failed to delete assets');
  }
};

export const getFontFamily = async (id_token: string, id: string) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/font-families/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;

  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};
export const createFontFamily = async (id_token: string, payload: FontFamily) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/font-families/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;

  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export const updateFontFamily = async (id_token: string, id: string, payload: FontFamily) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/font-families/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;

  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export const deleteFontFamily = async (id_token: string, id: string) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/font-families/${id}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;

  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export const getColorPalette = async (id_token: string, id: string) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/color-palettes/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  // if (!response.ok) return null;
  // return response.json();
  if (!response.ok) return null;

  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export const createColorPalette = async (id_token: string, payload: ColorPalette) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/color-palettes/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;

  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export const updateColorPalette = async (id_token: string, id: string, payload: ColorPalette) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/color-palettes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;

  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export const deleteColorPalette = async (id_token: string, id: string) => {
  const response = await fetch(`${API_URL}/data/v3/assets/user/color-palettes/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;

  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

export const login = async (params: any) => {
  const response = await fetch(`${API_URL}/auth/noflow/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const jsonErr: any = await response.json();
    return { error: jsonErr.detail };
  }

  return response.json();
};

export const signup = async (params: any) => {
  const response = await fetch(`${API_URL}/auth/noflow/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const jsonErr: any = await response.json();
    return { error: jsonErr.detail };
  }

  return response.json();
};

export const refreshToken = async (params: any) => {
  const response = await fetch(`${API_URL}/auth/noflow/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const jsonErr: any = await response.json();
    return { error: jsonErr.detail };
  }

  return response.json();
};

export const logout = async (id_token: string, params: any) => {
  const response = await fetch(`${API_URL}/auth/noflow/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${id_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const jsonErr: any = await response.json();
    return { error: jsonErr.detail };
  }

  return true;
};

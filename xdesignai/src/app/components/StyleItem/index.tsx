import React, { useEffect } from 'react';
import {
  userStyleItem,
  getColorPalette,
  createColorPalette,
  addStyleSetAssets,
  getFontFamily,
  createFontFamily,
} from '../../services';
import './index.scss';
import { VIEWS } from '../../constants';

const StyleItemContainer = ({
  styleItem,
  token,
  itemData,
  setItemName,
  setItemData,
  setColorPaletteTitle,
  setView,
  setColorPalette,
  setColorPaletteId,
  setFontPairingTitle,
  setFontPairing,
  setFontPairingId,
}) => {
  useEffect(() => {
    userStyleItem(token.id_token, styleItem)
      .then((res) => {
        setItemData(res.assets);
        setItemName(res.name);
      })
      .catch((error) => {
        console.error('An error occured:', error);
      });
  }, []);

  const selectColorPaletteTitle = async (title, index) => {
    getColorPalette(token.id_token, index)
      .then((res) => {
        setColorPalette(res);
        setColorPaletteId(index);
        setView(VIEWS.COLOR_PALETTE);
      })
      .catch((error) => {
        console.error('An error occured:', error);
      });
    setColorPaletteTitle(title);
  };

  const selectFontPairingTitle = async (title, index) => {
    getFontFamily(token.id_token, index)
      .then((res) => {
        setFontPairing(res);
        setFontPairingId(index);
        setView(VIEWS.FONT_PAIRING);
      })
      .catch((error) => {
        console.error('An error occured:', error);
      });
    setFontPairingTitle(title);
  };

  const createNewPalette = async () => {
    const temp = {
      name: 'New Color Palette',
      description: 'Description of the new color palette',
      public: true,
      type: 'figma',
      tags: ['New Color Palette'],
      palette_type: 'background+text_colors',
      data: {
        background_colors: [],
        text_colors: [],
      },
    };
    const tempItem = {};
    tempItem['color_palette'] = temp;
    if (itemData['color_palette'] != null) {
      createColorPalette(token.id_token, temp).then((res) => {
        console.log('RESULT', res.id);
        const ids = { color_palette: [res.id] };
        addStyleSetAssets(token.id_token, styleItem, ids);
        setColorPalette(temp);
        setColorPaletteId(res.id);
        setView(VIEWS.COLOR_PALETTE);
      });
    }
  };

  const createNewPairing = async () => {
    const temp = {
      name: 'Font Pairing 1',
      description: 'Modern fonts for cool UIs',
      public: true,
      tags: ['modern', 'cool', 'inter', 'ibm plex'],
      type: 'figma',
      data: {
        sans_serif: [
          {
            family: 'Inter',
            style: 'Regular',
            weight: 400,
            size: { min: 12, max: 40 },
          },
        ],
        serif: [
          {
            family: 'Railway',
            style: 'Bold',
            weight: 700,
            size: { min: 20, max: 40 },
          },
        ],
        monospace: [
          {
            family: 'IBM Plex Mono',
            style: 'Regular',
            weight: 400,
            size: { min: 12, max: 24 },
          },
        ],
      },
      pairing_type: 'sans_serif+serif+monospace',
    };
    if (itemData['font_family'] != null) {
      createFontFamily(token.id_token, temp).then((res) => {
        const ids = { font_family: [res.id] };
        addStyleSetAssets(token.id_token, styleItem, ids);
        setFontPairing(temp);
        setFontPairingId(res.id);
        setView(VIEWS.FONT_PAIRING);
      });
    }
  };

  const createNewRadius = async () => {};

  return (
    <div className="container style-item-container">
      <div className="style-list">
        <span className="list-title">Colors</span>
        {Object.entries(itemData['color_palette'] || {}).map(
          ([index, color]: [string, { name: string; id: string }]) => (
            <div key={index} className="style-item">
              <div className="style-item-text">{color.name}</div>
              <div className="edit-button" onClick={() => selectColorPaletteTitle(color.name, color.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <g opacity="0.6">
                    <path
                      d="M14.06 9L15 9.94L5.92 19H5V18.08L14.06 9ZM17.66 3C17.41 3 17.15 3.1 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04C21.1 6.65 21.1 6 20.71 5.63L18.37 3.29C18.17 3.09 17.92 3 17.66 3ZM14.06 6.19L3 17.25V21H6.75L17.81 9.94L14.06 6.19Z"
                      fill="white"
                    />
                  </g>
                </svg>
              </div>
            </div>
          )
        )}
        <div className="btn-style" onClick={() => createNewPalette()}>
          Add New Palette
        </div>
      </div>
      <div className="style-list">
        <span className="list-title">Fonts</span>
        {Object.entries(itemData['font_family'] || {}).map(([index, font]: [string, { name: string; id: string }]) => (
          <div key={index} className="style-item">
            <div className="style-item-text">{font.name}</div>
            <div className="edit-button" onClick={() => selectFontPairingTitle(font.name, font.id)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <g opacity="0.6">
                  <path
                    d="M14.06 9L15 9.94L5.92 19H5V18.08L14.06 9ZM17.66 3C17.41 3 17.15 3.1 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04C21.1 6.65 21.1 6 20.71 5.63L18.37 3.29C18.17 3.09 17.92 3 17.66 3ZM14.06 6.19L3 17.25V21H6.75L17.81 9.94L14.06 6.19Z"
                    fill="white"
                  />
                </g>
              </svg>
            </div>
          </div>
        ))}
        <div className="btn-style" onClick={() => createNewPairing()}>
          Add New Pairing
        </div>
      </div>
      <div className="style-list">
        <span className="list-title">Border Radius</span>
        {Object.entries(itemData['border_radius'] || {}).map(
          ([index, radius]: [string, { name: string; id: string }]) => (
            <div key={index} className="style-item">
              <div className="style-item-text">{radius.name}</div>
              <div className="edit-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <g opacity="0.6">
                    <path
                      d="M14.06 9L15 9.94L5.92 19H5V18.08L14.06 9ZM17.66 3C17.41 3 17.15 3.1 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04C21.1 6.65 21.1 6 20.71 5.63L18.37 3.29C18.17 3.09 17.92 3 17.66 3ZM14.06 6.19L3 17.25V21H6.75L17.81 9.94L14.06 6.19Z"
                      fill="white"
                    />
                  </g>
                </svg>
              </div>
            </div>
          )
        )}
        <div className="btn-style" onClick={() => createNewRadius()}>
          Add New
        </div>
      </div>
    </div>
  );
};

export default StyleItemContainer;

import React, { useState } from 'react';
import PromptContainer from '../../components/Prompt';
import UploadContainer from '../../components/Upload';
import SettingsContainer from '../../components/Settings';
import StyleItemContainer from '../../components/StyleItem';
import ColorPaletteContainer from '../../components/ColorPalette';
import FontPairingContainer from '../../components/FontPairing';
import { MAIN_TABS, VIEWS } from '../../constants';
import IconBack from '../../assets/ic_back.svg';
import IconUpload from '../../assets/upload.png';
import IconSetting from '../../assets/settings.png';
import './index.scss';

const MainPage = ({ subscribed, appSettings, token, onSignOut }) => {
  const [tab, setTab] = useState(MAIN_TABS.GENERATE);
  const [processing, setProcessing] = useState(false);

  const [view, setView] = useState(VIEWS.MAIN);
  const [styleItem, setStyleItem] = useState('');
  const [itemData, setItemData] = useState({});
  const [colorPalette, setColorPalette] = useState('');
  const [colorPaletteTitle, setColorPaletteTitle] = useState('');
  const [colorPaletteId, setColorPaletteId] = useState(0);
  const [fontPairing, setFontPairing] = useState('');
  const [fontPairingTitle, setFontPairingTitle] = useState('');
  const [fontPairingId, setFontPairingId] = useState(0);
  const [itemName, setItemName] = useState('');

  // const saveSettings = (_settings) => {
  //   if (!_settings) return;

  //   const newSettings = { ...settings, ..._settings };
  //   setSettings(newSettings);
  //   parent.postMessage({ pluginMessage: { type: 'SAVE_SETTINGS', settings: newSettings } }, '*');
  // };

  return (
    <div className="page main-page">
      {view === VIEWS.MAIN ? (
        <div className="page-tabs">
          {Object.keys(MAIN_TABS).map((key) => (
            <div
              key={key}
              className={`page-tab ${tab === MAIN_TABS[key] ? 'active' : processing ? 'disabled' : ''}`}
              onClick={() => !processing && setTab(MAIN_TABS[key])}
            >
              {MAIN_TABS[key]}
            </div>
          ))}
          <div className="page-settings">
            <div className="btn-setting" onClick={() => setView(VIEWS.UPLOAD)}>
              <img src={IconUpload} alt="setting" width={15} height={15} />
            </div>
            <div className="btn-setting" onClick={() => setView(VIEWS.SETTINGS)}>
              <img src={IconSetting} alt="setting" width={15} height={15} />
            </div>
          </div>
        </div>
      ) : view === VIEWS.STYLE_ITEM ? (
        <div className="page-header">
          <div className="btn-back" onClick={() => setView(VIEWS.SETTINGS)}>
            <img src={IconBack} alt="back" width={15} height={15} />
            Back
          </div>
          <span className="header-text">{itemName}</span>
        </div>
      ) : view === VIEWS.COLOR_PALETTE || view === VIEWS.FONT_PAIRING ? (
        <div className="page-header">
          <div className="btn-back" onClick={() => setView(VIEWS.STYLE_ITEM)}>
            <img src={IconBack} alt="back" width={15} height={15} />
            Back
          </div>
          <span className="header-text">{view === VIEWS.COLOR_PALETTE ? colorPaletteTitle : fontPairingTitle}</span>
        </div>
      ) : (
        <div className="page-header">
          <div className="btn-back" onClick={() => setView(VIEWS.MAIN)}>
            <img src={IconBack} alt="back" width={15} height={15} />
            Back
          </div>
          <span className="header-text">{view}</span>
        </div>
      )}
      {
        {
          [VIEWS.MAIN]: (
            <PromptContainer
              settings={appSettings}
              tab={tab}
              token={token}
              goSubscribe={() => setView(VIEWS.SETTINGS)}
              onProcessing={(processing: boolean) => setProcessing(processing)}
            />
          ),
          [VIEWS.UPLOAD]: <UploadContainer token={token} />,
          [VIEWS.SETTINGS]: (
            <SettingsContainer
              token={token}
              subscriptionStatus={subscribed}
              onSignOut={onSignOut}
              setStyleItem={setStyleItem}
              setView={setView}
            />
          ),
          [VIEWS.STYLE_ITEM]: (
            <StyleItemContainer
              styleItem={styleItem}
              token={token}
              itemData={itemData}
              setItemName={setItemName}
              setItemData={setItemData}
              setColorPaletteTitle={setColorPaletteTitle}
              setView={setView}
              setColorPalette={setColorPalette}
              setColorPaletteId={setColorPaletteId}
              setFontPairingTitle={setFontPairingTitle}
              setFontPairing={setFontPairing}
              setFontPairingId={setFontPairingId}
            />
          ),
          [VIEWS.COLOR_PALETTE]: (
            <ColorPaletteContainer
              token={token}
              colorPalette={colorPalette}
              setColorPalette={setColorPalette}
              colorPaletteId={colorPaletteId}
            />
          ),
          [VIEWS.FONT_PAIRING]: (
            <FontPairingContainer
              token={token}
              fontPairing={fontPairing}
              setFontPairing={setFontPairing}
              fontPairingId={fontPairingId}
            />
          ),
        }[view]
      }
    </div>
  );
};

export default MainPage;

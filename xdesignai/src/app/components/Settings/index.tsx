import React, { useEffect, useState } from 'react';
import { STRIPE_URL, VIEWS } from '../../constants';
import { logout, userStyleList, createStyleSet } from '../../services';
import './index.scss';

const SettingsContainer = ({ subscriptionStatus, token, onSignOut, setStyleItem, setView }) => {
  const [processing, setProcessing] = useState(false);
  // const [mode, setMode] = useState(GENERATE_MODES[0]);
  // const [style, setStyle] = useState(AI_STYLES[0]);
  // const [model, setModel] = useState(AI_MODELS[0]);
  const [styleList, setStyleList] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const displayedItems = showAll ? Object.entries(styleList || {}) : Object.entries(styleList || {}).slice(0, 3);

  const handleSubscribe = () => {
    window.open(STRIPE_URL, '_blank');
  };

  const handleLogout = async () => {
    if (processing) return;

    setProcessing(true);
    const params = {
      access_token: token.access_token,
    };
    await logout(token.id_token, params);
    parent.postMessage({ pluginMessage: { type: 'RESET' } }, '*');
    onSignOut();
    setProcessing(false);
  };

  const createNewStyle = async () => {
    if (processing) return;
    createStyleSet(token.id_token, {
      name: 'My Style set 1',
      description: 'Best style set in the world',
      public: true,
      tags: ['modern'],
      type: 'figma',
    }).then((res) => {
      setStyleList(res.results);
      setView(VIEWS.STYLE_ITEM);
      setStyleItem(res.id);
    });
  };

  const selectStyleItem = async (id: any) => {
    // if (processing) return;
    setView(VIEWS.STYLE_ITEM);
    setStyleItem(id);
  };

  useEffect(() => {
    userStyleList(token.id_token).then((res) => {
      setStyleList(res.results);
    });
  }, []);

  // useEffect(() => {
  //   if (!settings) return;

  //   const newMode = GENERATE_MODES.find((x) => x.value === settings.mode);
  //   setMode(newMode || GENERATE_MODES[0]);
  //   const newStyle = AI_STYLES.find((x) => x.value === settings.style);
  //   setStyle(newStyle || AI_STYLES[0]);
  //   const newModel = AI_MODELS.find((x) => x.value === settings.model);
  //   setModel(newModel || AI_MODELS[0]);
  // }, [settings]);

  return (
    <div className="container settings-container">
      <div className="notification">
        {subscriptionStatus ? (
          <span>&#x2714;&nbsp;&nbsp;You have unlimited success</span>
        ) : (
          <div className="btn-submit" onClick={handleSubscribe}>
            Please Subscribe
          </div>
        )}
      </div>
      {/* <div className="section">
        <span className="section-title">Mode</span>
        <Select
          className="dropdown"
          classNamePrefix="dropdown-content"
          options={GENERATE_MODES}
          value={mode}
          onChange={(option) => {
            if (!subscriptionStatus) return;
            setMode(option);
            if (option.value === GENERATE_MODES[0].value) {
              onSaveSettings({ mode: option.value });
            } else {
              onSaveSettings({ mode: option.value, style: AI_STYLES[0].value, model: AI_MODELS[0].value });
            }
          }}
          maxMenuHeight={100}
          isDisabled={!subscriptionStatus}
        />
      </div>
      {mode.value !== GENERATE_MODES[0].value && (
        <>
          <div className="section">
            <span className="section-title">Style</span>
            <Select
              className="dropdown"
              classNamePrefix="dropdown-content"
              options={AI_STYLES}
              value={style}
              onChange={(option) => {
                if (!subscriptionStatus) return;
                setStyle(option);
                onSaveSettings({ style: option.value });
              }}
              maxMenuHeight={100}
              isDisabled={!subscriptionStatus}
            />
          </div>
          <div className="section">
            <span className="section-title">Model</span>
            <Select
              className="dropdown"
              classNamePrefix="dropdown-content"
              options={AI_MODELS}
              value={model}
              onChange={(option) => {
                if (!subscriptionStatus) return;
                setModel(option);
                onSaveSettings({ model: option.value });
              }}
              maxMenuHeight={100}
              isDisabled={!subscriptionStatus}
            />
          </div>
        </>
      )} */}
      <div className="style-list">
        <span className="list-title">Custom Styles</span>
        {displayedItems.map(([key, styleItem]) => (
          <div key={key} className="style-item">
            <div className="style-item-text">{styleItem.name}</div>
            <div className="edit-button" onClick={() => selectStyleItem(styleItem.id)}>
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
      </div>
      <div className="btn-style" onClick={() => createNewStyle()}>
        {processing ? 'Creating new style...' : 'Create new style'}
      </div>
      {!showAll && (
        <div className="btn-secondary" onClick={() => setShowAll(true)}>
          See all styles
        </div>
      )}
      <div className="btn-secondary" onClick={() => handleLogout()}>
        {processing ? 'Logging out...' : 'Log out'}
      </div>
    </div>
  );
};

export default SettingsContainer;

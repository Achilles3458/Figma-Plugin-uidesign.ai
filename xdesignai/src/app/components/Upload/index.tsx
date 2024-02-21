import React, { useEffect, useState } from 'react';
import {
  ENDPOINT_UPLOAD_ASSETS,
  ENDPOINT_UPLOAD_EPOCH,
  UploadAssetsResponseSchema,
  UploadResponse,
  UploadResponseSchema,
  UPLOAD_VISIBILITY,
} from '../../constants';
import {
  StatusBadRequest,
  StatusCreated,
  StatusForbidden,
  StatusInternalError,
  StatusNetworkError,
  StatusResponseServerError,
  StatusUnprocessableEntity,
  statusBadRequest,
  statusCreated,
  statusForbidden,
  statusInternalError,
  statusNetworkError,
  statusResponseServerError,
  statusUnprocessableEntity,
} from '../../constants/status';
import './index.scss';

const UploadContainer = ({ token }) => {
  const [processing, setProcessing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState(false);
  const [sectionSelected, setSectionSelected] = useState(false);
  const [assets, setAssets] = useState<any>(null);
  const [screens, setScreens] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.onmessage = async (event) => {
      const { type, sectionTitle, hasSelection, assets, screens } = event.data.pluginMessage;
      if (type === 'GET_SELECTION') {
        setSectionSelected(hasSelection);
        setTitle(sectionTitle[0]);
        setDescription(sectionTitle[1]);
        setAssets(assets);
        setScreens(screens);
      }
    };
    parent.postMessage({ pluginMessage: { type: 'GET_SELECTION' } }, '*');
  }, []);

  async function uploadSection(): Promise<
    | [StatusCreated, UploadResponse]
    | [
        (
          | StatusNetworkError
          | StatusBadRequest
          | StatusForbidden
          | StatusUnprocessableEntity
          | StatusResponseServerError
          | StatusInternalError
        ),
        null
      ]
  > {
    // Upload assets ...
    let assetsResponse: Response;
    try {
      assetsResponse = await fetch(ENDPOINT_UPLOAD_ASSETS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.id_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assets),
      });
    } catch (error) {
      return [statusNetworkError, null];
    }
    if (assetsResponse.status < 200 || assetsResponse.status >= 300) {
      switch (assetsResponse.status) {
        case 403:
          return [statusForbidden, null];
        case 422:
          return [statusUnprocessableEntity, null];
        case 503:
          return [statusResponseServerError, null];
        default:
          return [statusInternalError, null];
      }
    }
    const assetsResponseJSON = await assetsResponse.json();
    const safeAssetsResponseJSON = UploadAssetsResponseSchema.safeParse(assetsResponseJSON);
    if (!safeAssetsResponseJSON.success) {
      return [statusBadRequest, null];
    }

    // Mutate in place ...
    for (const screen of screens) {
      for (const key in screen.meta.theme.images) {
        if (key in safeAssetsResponseJSON.data) {
          screen.meta.theme.images[key] = {
            type: 'POSTPROCESSED',
            value: {
              url: safeAssetsResponseJSON.data[key].url, // Overwrite value
              description: safeAssetsResponseJSON.data[key].description, // Overwrite value
            },
          };
        }
      }
    }

    const epoch = {
      name: '' + Date.now(),
      apps: [
        {
          meta: {},
          name: title,
          description,
          tags: tags.split(','),
          public: visibility,
          screens,
        },
      ],
    };
    // Upload epoch ...
    let epochResponse: Response;
    try {
      epochResponse = await fetch(ENDPOINT_UPLOAD_EPOCH, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.id_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(epoch),
      });
    } catch (error) {
      return [statusNetworkError, null];
    }
    if (epochResponse.status < 200 || epochResponse.status >= 300) {
      switch (epochResponse.status) {
        case 403:
          return [statusForbidden, null];
        case 422:
          return [statusUnprocessableEntity, null];
        case 503:
          return [statusResponseServerError, null];
        default:
          return [statusInternalError, null];
      }
    }
    const epochResponseJSON = await epochResponse.json();
    const safeEpochResponseJSON = UploadResponseSchema.safeParse(epochResponseJSON);
    if (!safeEpochResponseJSON.success) {
      return [statusBadRequest, null];
    }
    return [statusCreated, safeEpochResponseJSON.data];
  }

  const handleUpload = async () => {
    if (title.length === 0 || description.length === 0 || tags.length === 0) {
      setErrorMsg('Please make sure you added the details - title, description, tags');
      return;
    }

    if (processing) return;

    setProcessing(true);
    setErrorMsg('');

    const resp = await uploadSection();
    if (resp[0].code === statusCreated.code) {
      setErrorMsg(`Successfully Created ${resp[1]!.collection_id}`);
    } else {
      setErrorMsg(resp[0].type);
    }
    setProcessing(false);
  };

  return (
    <div className="container upload-container">
      <div className="notification">
        {sectionSelected ? (
          <span>&#x2714;&nbsp;&nbsp;Ready to upload</span>
        ) : (
          <span>&#9432;&nbsp;&nbsp;No section selected yet</span>
        )}
      </div>
      {!sectionSelected ? (
        <span className="description">
          To create you must select a Section. In the section be sure to this naming convention:
          <br />
          <br />
          Title of the project - Description of project
        </span>
      ) : (
        <>
          <div className="section">
            <span className="section-title">Title</span>
            <div className="section-content">
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div className="section">
            <span className="section-title">Description</span>
            <div className="section-content">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="section">
            <span className="section-title">Tags (i.e: Websites | Mobile Apps | Slides)</span>
            <div className="section-content">
              <textarea value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Add tags with commas" />
            </div>
          </div>
          <div className="section">
            <span className="section-title">Visibility</span>
            <div className="section-content">
              <div className="radio-options">
                {UPLOAD_VISIBILITY.map((option, index) => (
                  <div
                    key={index}
                    className={`radio-option ${option.value === visibility ? 'active' : ''}`}
                    onClick={() => setVisibility(option.value)}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {errorMsg.length > 0 ? <span className="error-msg">{errorMsg}</span> : ''}
          <div className="btn-submit" onClick={() => handleUpload()}>
            {processing ? 'Uploading' : 'Upload'}
          </div>
        </>
      )}
    </div>
  );
};

export default UploadContainer;

import React, { useEffect, useRef, useState } from 'react';
import {
  AI_MODELS,
  // GENERATE_MODES,
  ENDPOINT_DOWNLOAD_EPOCH,
  PROCESSING_STATUS,
  STREAM_URL,
  ENDPOINT_PING,
  MAIN_TABS,
  GENERATE_FEATURES,
  UPDATE_FEATURES,
  ENDPOINT_UPDATE_FRAME,
  ENDPOINT_UPLOAD_ASSETS,
  UploadAssetsResponseSchema,
} from '../../constants';
import { processImages } from '../../lib/utils';
import { beautifyHtml } from '../../utils';
import { traverseLayers } from '../../functions/traverse-layers';
import { htmlToFigma } from '../../lib/html-to-figma';
import './index.scss';

const PromptContainer = ({ settings, token, goSubscribe, onProcessing, tab }) => {
  const FINAL_HTML = '<span>Finish</span>';

  const [promptDisabled, setPromptDisabled] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [feature, setFeature] = useState(tab === MAIN_TABS.GENERATE ? GENERATE_FEATURES[0] : UPDATE_FEATURES[0]);

  const [errorMsg, setErrorMsg] = useState('');
  const [processing, setProcessing] = useState(false);

  const [status, setStatus] = useState(PROCESSING_STATUS.Init);
  const [htmlList, setHtmlList] = useState([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const processingRef = useRef<boolean>(false);

  const [embedGenerate, setEmbedGenerate] = useState(false);
  const [embedHtml, setEmbedHtml] = useState('');
  const [postImage, setPostImage] = useState(false);

  useEffect(() => {
    if (window) {
      window.onmessage = (event) => {
        const { type } = event.data.pluginMessage;
        if (type === 'import-stream-done') {
          if (htmlList.length === 0) {
            setStatus(PROCESSING_STATUS.No_Html);
          } else {
            updateIframe();
          }
        } else if (type === 'import-done') {
          setProcessing(false);
          setPromptDisabled(false);
          setStatus(PROCESSING_STATUS.Finished);
        } else if (type === 'DRAW_SCREENS') {
          setProcessing(false);
          setPromptDisabled(false);
        } else if (type === 'UPDATE_FRAME_SELECTION') {
          const { hasSelection } = event.data.pluginMessage;
          if (hasSelection) handleUpdateFrame(event.data.pluginMessage);
          else {
            setErrorMsg('Please select a frame to update.');
            setProcessing(false);
            setPromptDisabled(false);
          }
        }
      };
    }
    if (status === PROCESSING_STATUS.Started) {
      setStatus(PROCESSING_STATUS.In_Progress);
      updateIframe();
    } else if (htmlList.length > 0 && status === PROCESSING_STATUS.No_Html) {
      setStatus(PROCESSING_STATUS.In_Progress);
      updateIframe();
    }
  }, [status, JSON.stringify(htmlList)]);

  useEffect(() => {
    processingRef.current = processing;
    onProcessing(processing);
  }, [processing]);

  useEffect(() => {
    setPromptText('');
    setFeature(tab === MAIN_TABS.GENERATE ? GENERATE_FEATURES[0] : UPDATE_FEATURES[0]);
  }, [tab]);

  const sendPing = () => {
    try {
      const options = {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.id_token}`,
        },
      };

      fetch(ENDPOINT_PING, options);
    } catch (e) {}
  };

  const processPlugin = () => {
    switch (tab) {
      case MAIN_TABS.GENERATE:
        handleGenerate();
        break;
      case MAIN_TABS.UPDATE:
        getFrameSelectionToUpdate();
        break;
      default:
        handleProcessAI();
        break;
    }
  };

  const handleKeyDown = (event: any) => {
    if (event.keyCode === 13 && isValid()) {
      processPlugin();
    }
  };

  const updateIframe = () => {
    if (htmlList.length === 0) {
      setStatus(PROCESSING_STATUS.No_Html);
      return;
    }
    const domHtml = htmlList.shift();
    if (domHtml !== FINAL_HTML) setEmbedHtml(domHtml);

    refreshIframe(domHtml, 1280);
  };

  const refreshIframe = (domHtml, bp) => {
    const iframeSection = document.getElementById('iframe-section');
    document.querySelector(`#iframe-${bp}`) && iframeSection.removeChild(document.querySelector(`#iframe-${bp}`));

    let iframe = document.createElement('iframe');
    iframe.id = `iframe-${bp}`;
    iframe.width = `${bp}px`;
    iframe.height = '800px';
    iframe.onload = () => addFigmaHtml(bp);
    iframe.srcdoc = domHtml;
    iframeSection.appendChild(iframe);
  };

  const addFigmaHtml = async (breakpoint: number) => {
    try {
      const useFrames = true;
      const frameEl = document.querySelector(`#iframe-${breakpoint}`) as HTMLIFrameElement;
      if (!frameEl) return;

      const myWindow = frameEl.contentWindow;
      const myDocument = myWindow.document;

      if (!myWindow || !myDocument || !myDocument.documentElement) {
        return;
      }
      if (myDocument.body.innerHTML === FINAL_HTML) {
        if (!postImage) {
          setPostImage(true);
          setStatus(PROCESSING_STATUS.No_Html);
          setHtmlList([embedHtml, FINAL_HTML]);
          return;
        }
        parent.postMessage(
          {
            pluginMessage: {
              type: 'IMPORT_SITE_STREAM',
              breakpoint,
              promptText,
              done: true,
            },
          },
          '*'
        );
      } else {
        const layers = htmlToFigma(myWindow, 'body', useFrames, postImage);
        const data: any = { layers };

        const html_data = await Promise.all(
          [data].concat(
            data.layers.map(async (rootLayer: TextNode | RectangleNode) => {
              await traverseLayers(rootLayer, async (layer: any) => {
                await processImages(layer);
              });
            })
          )
        );

        parent.postMessage(
          {
            pluginMessage: {
              type: 'IMPORT_SITE_STREAM',
              data: html_data[0],
              breakpoint,
              promptText,
            },
          },
          '*'
        );
      }
    } catch (_) {}
  };

  const createWebsite = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setHtmlList([]);
    setStatus(PROCESSING_STATUS.Init);
    setEmbedGenerate(false);
    setPostImage(false);
    try {
      const model = settings.model || AI_MODELS[1].value;

      const options = {
        method: 'GET',
        signal: abortControllerRef.current.signal,
        headers: {
          Authorization: `Bearer ${token.id_token}`,
        },
      };

      let streamUrl = '';
      switch (settings.style) {
        case 'default':
          streamUrl = 'https://app.uidesign.ai/stream/original';
          const processDefault = async () => {
            let respAI;
            try {
              respAI = await fetch(`${streamUrl}?prompt=${promptText}&model=${model}&style=${settings.style}`, options);
            } catch (e) {
              setProcessing(false);
              setPromptDisabled(false);
              setStatus(PROCESSING_STATUS.Finished);
              setHtmlList([FINAL_HTML]);
              return;
            }
            // Read the response as a stream of data
            const reader = respAI.body.getReader();
            const decoder = new TextDecoder('utf-8');
            const parser = new DOMParser();

            let streamHtml = '',
              streamCSS = '';
            let isStarted = false;
            while (true) {
              if (!processingRef.current) {
                break;
              }
              let { done, value } = await reader.read();
              if (done) {
                setHtmlList((prev) => [...prev, FINAL_HTML]);
                break;
              }

              // Massage and parse the chunk of data
              let chunk = decoder.decode(value);
              let lines = chunk.split('\n');
              // console.log(chunk);
              let parsedLines = [];
              try {
                parsedLines = lines
                  .map((line) => line.replace(/^data: /, '').trim()) // Remove the "data: " prefix
                  .filter((line) => line !== '') // Remove empty lines
                  .map((line) => JSON.parse(line)); // Parse the JSON string
              } catch (e) {
                parsedLines = [];
              }
              for (let parsedLine of parsedLines) {
                let { type, data } = parsedLine;
                if (data === '[DONE]') continue;

                if (type === 'html') streamHtml += data;
                else if (type === 'css') streamCSS += data;
                else if (type === 'error') {
                  setErrorMsg(data || 'Something wrong.');
                  goSubscribe();
                  break;
                }
              }

              let bodyHtml = '';
              try {
                streamHtml = beautifyHtml(streamHtml);
                bodyHtml = parser.parseFromString(streamHtml, 'text/html').body.innerHTML;
              } catch (e) {
                continue;
              }

              let domHtml = `<html><body><style>${streamCSS}</style>${bodyHtml}</body></html>`;
              // setHtmlList((prev) => [...prev, domHtml]);
              setHtmlList([domHtml]);
              if (!isStarted) {
                isStarted = true;
                setStatus(PROCESSING_STATUS.Started);
              }
            }
          };
          processDefault();
          break;
        case 'tailwind':
          streamUrl = `${STREAM_URL}/create`;
          const processTailwind = async () => {
            let respAI;
            try {
              respAI = await fetch(`${STREAM_URL}/create?prompt=${promptText}&model=${model}&style=tailwind`, options);
            } catch (e) {
              setProcessing(false);
              setPromptDisabled(false);
              setStatus(PROCESSING_STATUS.Finished);
              setHtmlList([FINAL_HTML]);
              return;
            }

            // Read the response as a stream of data
            const reader = respAI.body.getReader();
            const decoder = new TextDecoder('utf-8');

            let streamHtml = '',
              streamCSS = '';
            let isStarted = false;
            let content = {} as Record<string, any>;
            let head = '';
            while (true) {
              if (!processingRef.current) {
                break;
              }
              const { done, value } = await reader.read();
              if (done) {
                setHtmlList((prev) => [...prev, FINAL_HTML]);
                break;
              }
              // original
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              let parsedLines = [];
              try {
                parsedLines = lines
                  .map((line) => line.replace(/^data: /, '').trim()) // Remove the "data: " prefix
                  .filter((line) => line !== '') // Remove empty lines
                  .map((line) => JSON.parse(line)); // Parse the JSON string
              } catch (e) {
                // console.log(e);
                parsedLines = [];
              }
              for (const parsedLine of parsedLines) {
                const { type, data } = parsedLine;
                if (type === 'layout') {
                  // set component order
                  data.forEach((name: string) => {
                    content[name] = {};
                  });
                }
                if (type === 'html') {
                  // Note: width 100% is not compatible with Figma
                  content[data.name] = (data.data as string).replace(/width="100\%"/g, '');
                  streamHtml = Object.entries(content)
                    .map(([_, html]) => html)
                    .join('\n');
                } else if (type === 'css') {
                  streamCSS += data;
                } else if (type === 'error') {
                  setErrorMsg(data || 'Something wrong.');
                  if (data.includes('limit')) {
                    goSubscribe();
                  }
                  break;
                } else if (type === 'head') head = data;
              }
              const domHtml = `<html><head>${head}</head><body><style>${streamCSS}</style>${streamHtml}</body></html>`;
              setHtmlList(() => [domHtml]);
              // setHtmlList((prev) => [...prev, domHtml]);
              if (!isStarted) {
                isStarted = true;
                setStatus(PROCESSING_STATUS.Started);
              }
            }
          };
          processTailwind();
          break;
        default:
          break;
      }
    } catch (e) {
      // console.log(e);
    }
  };

  const handleProcessAI = () => {
    if (!isValid()) return;

    setErrorMsg('');
    if (processing) {
      // Could not stop figma loading process
      if (embedGenerate) return;

      // To stop streaming process
      setProcessing(false);
      setPromptDisabled(false);
      setStatus(PROCESSING_STATUS.Finished);
      setHtmlList([FINAL_HTML]);
    } else {
      sendPing();

      setProcessing(true);
      setPromptDisabled(true);
      createWebsite();
    }
  };

  const handleGenerate = async () => {
    if (processing || !isValid()) return;

    setProcessing(true);
    setPromptDisabled(true);
    setErrorMsg('');
    try {
      const body = {
        prompt: promptText,
        temperature: 0,
        threshold: 0,
        tags: [feature.value],
      };

      sendPing();

      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.id_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      };

      const response = await fetch(ENDPOINT_DOWNLOAD_EPOCH, options);
      if (response.status === 200) {
        const payload = await response.json();
        if (!payload || !payload.screens || payload.screens.length === 0) throw new Error('No screens');
        parent.postMessage(
          {
            pluginMessage: {
              type: 'DRAW_SCREENS',
              prompt: promptText,
              payload,
            },
          },
          '*'
        );
      } else if (response.status === 429) {
        goSubscribe();
      }
    } catch (e) {
      // console.log(e);
      setErrorMsg(e.toString());
      setProcessing(false);
      setPromptDisabled(false);
    }
  };

  const getFrameSelectionToUpdate = () => {
    if (processing || !isValid()) return;

    setProcessing(true);
    setPromptDisabled(true);
    setErrorMsg('');

    parent.postMessage({ pluginMessage: { type: 'UPDATE_FRAME_SELECTION', promptText, feature: feature.value } }, '*');
  };

  const handleUpdateFrame = async ({ assets, screen, promptText, feature }) => {
    try {
      sendPing();
      // Upload assets ...
      const assetsResponse: Response = await fetch(ENDPOINT_UPLOAD_ASSETS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.id_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assets),
      });
      if (assetsResponse.status < 200 || assetsResponse.status >= 300) {
        throw new Error('could not upload assets');
      }

      const assetsResponseJSON = await assetsResponse.json();
      const safeAssetsResponseJSON = UploadAssetsResponseSchema.safeParse(assetsResponseJSON);
      if (!safeAssetsResponseJSON.success) {
        throw new Error('could not upload assets2');
      }

      // Mutate in place ...
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

      const body = {
        prompt: promptText,
        type: feature,
        data: screen.root,
        meta: screen.meta,
      };

      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.id_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      };

      const response = await fetch(ENDPOINT_UPDATE_FRAME, options);
      if (response.status === 200) {
        const frameData = await response.json();

        const payload = {
          screens: [
            {
              description: screen.description,
              name: screen.name,
              root: frameData.data,
              meta: frameData.meta,
            },
          ],
        };
        parent.postMessage(
          {
            pluginMessage: {
              type: 'DRAW_SCREENS',
              prompt: promptText,
              payload,
              redraw: true,
            },
          },
          '*'
        );
      } else if (response.status === 429) {
        goSubscribe();
      }
    } catch (e) {
      // console.log(e);
      setErrorMsg(e.toString());
      setProcessing(false);
      setPromptDisabled(false);
    }
  };

  const isValid = () => {
    return promptText !== '';
  };

  const FEATURES = tab === MAIN_TABS.GENERATE ? GENERATE_FEATURES : UPDATE_FEATURES;
  return (
    <div className="container prompt-container">
      <div className="section">
        <div className="section-content">
          {processing ? (
            <div className="lds-container prompt">
              <div className="lds-spinner">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
              <div className="lds-text">
                {tab === MAIN_TABS.GENERATE ? 'Generating' : 'Updating to'} &ldquo;{promptText}&rdquo;
              </div>
            </div>
          ) : errorMsg.length > 0 ? (
            <>
              <div className="error-container">
                <span className="error-icon">&#9432;</span>
                <span className="error-title">
                  Unable to {tab === MAIN_TABS.GENERATE ? 'generate' : 'update design'}
                </span>
                <span className="error-description">&ldquo;{promptText}&rdquo;</span>
              </div>
              <div className="grid-buttons">
                <div
                  className="btn-submit secondary"
                  onClick={() => {
                    setErrorMsg('');
                    processPlugin();
                  }}
                >
                  &#8635; Retry
                </div>
                <div className="btn-submit" onClick={() => setErrorMsg('')}>
                  {tab === MAIN_TABS.GENERATE ? 'Generate' : 'Update'} New
                </div>
              </div>
            </>
          ) : (
            <>
              <textarea
                className={`${promptDisabled ? 'disabled' : ''}`}
                disabled={promptDisabled}
                value={promptText}
                placeholder={`Describe your ${tab === MAIN_TABS.GENERATE ? 'design' : 'update'}`}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <select
                className="dropdown"
                onChange={(e) => {
                  const option = FEATURES.find((x) => x.value === e.target.value);
                  setFeature(option);
                }}
                value={feature.value}
                disabled={!!processing}
              >
                {FEATURES.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>
      {errorMsg.length === 0 ? (
        <>
          <div className="section iframe" id="iframe-section" />
          <div
            className={`btn-submit ${!isValid() ? 'disabled' : ''} ${processing ? 'processing' : ''}`}
            onClick={() => processPlugin()}
          >
            {tab === MAIN_TABS.GENERATE
              ? processing
                ? 'Generating...'
                : 'Generate Design'
              : processing
              ? 'Updating...'
              : 'Update Design'}
          </div>
        </>
      ) : (
        ''
      )}
    </div>
  );
};

export default PromptContainer;

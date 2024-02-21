import React, { useEffect, useState } from 'react';
import { updateColorPalette } from '../../services';
import Select from 'react-select';
import { PALETTE_TYPES, Color, Gradient, GradientStop } from '../../constants';
import ReactGPicker from 'react-gcolor-picker';
import './index.scss';

const ColorPaletteContainer = ({ token, colorPalette, setColorPalette, colorPaletteId }) => {
  const [paletteType, setPaletteType] = useState(PALETTE_TYPES[0]);
  const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false);
  const [showGradientColorPicker, setShowGradientColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showAddBackgroundColorPicker, setShowAddBackgroundColorPicker] = useState(false);
  const [showAddTextColorPicker, setShowAddTextColorPicker] = useState(false);
  const [showAddGradientColorPicker, setShowAddGradientColorPicker] = useState(false);
  const [selectedBackgroundColorId, setSelectedBackgroundColorId] = useState('0');
  const [selectedTextColorId, setSelectedTextColorId] = useState('0');
  const [selectedGradientColorId, setSelectedGradientColorId] = useState('0');
  const [temporaryColorPalette, setTemporaryColorPalette] = useState(colorPalette);
  const [addBackgroundColor, setAddBackgroundColor] = useState('');
  const [addTextColor, setAddTextColor] = useState('');
  const [addGradientColor, setAddGradientColor] = useState({});
  const [tags, setTags] = useState(colorPalette.tags.join(', '));
  const [description, setDescription] = useState(colorPalette.description);
  const [isDescriptionActive, setIsDescriptionActive] = useState(false);
  const [isTagActive, setIsTagActive] = useState(false);
  useEffect(() => {
    // Delete Color Palette Data and Add Gradient Color
    // const temp = colorPalette;
    // const tempData = {
    //     "type": "GRADIENT_LINEAR",
    //     "gradientStops": [
    //       {
    //         "color": {
    //           "a": 1,
    //           "b": 0.64,
    //           "g": 0.5,
    //           "r": 0.89
    //         },
    //         "position": 0
    //       },
    //       {
    //         "color": {
    //           "a": 1,
    //           "b": 0.33,
    //           "g": 0.22,
    //           "r": 0.98
    //         },
    //         "position": 1
    //       }
    //     ],
    //     "gradientTransform": [
    //       [1, 0, 0],
    //       [0, 1, 0]
    //     ]
    // };
    // temp.data["gradient_colors"].pop();

    // temp.data["gradient_colors"].push(tempData);
    // temp.type= "figma";
    // updateColorPalette(token.id_token, colorPaletteId, temp);
    if (colorPalette.palette_type == 'Background + Text Colors') {
      setPaletteType(PALETTE_TYPES[0]);
    } else {
      setPaletteType(PALETTE_TYPES[1]);
    }
  }, []);
  useEffect(() => {
    setTemporaryColorPalette(colorPalette);
  }, [colorPalette]);

  useEffect(() => {
    updateColorPalette(token.id_token, colorPaletteId, temporaryColorPalette).then(() => {
      setColorPalette(temporaryColorPalette);
    });
  }, [showBackgroundColorPicker, showGradientColorPicker, showTextColorPicker]);

  useEffect(() => {
    if (addBackgroundColor != '' && showAddBackgroundColorPicker != true) {
      const temp = { ...temporaryColorPalette };
      if (temp.data['background_colors'] == null) {
        temp.data['background_colors'] = [];
        temp.data['background_colors'].push(addBackgroundColor);
      } else {
        const count = temporaryColorPalette.data['background_colors'].length;
        temp.data['background_colors'][count] = addBackgroundColor;
      }
      setTemporaryColorPalette(temp);

      updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
        setColorPalette(temp);
      });
    }
  }, [addBackgroundColor, showAddBackgroundColorPicker]);

  useEffect(() => {
    if (addTextColor != '' && showAddTextColorPicker != true) {
      const temp = { ...temporaryColorPalette };
      if (temp.data['text_colors'] == null) {
        temp.data['text_colors'] = [];
        temp.data['text_colors'].push(addTextColor);
      } else {
        const count = temporaryColorPalette.data['text_colors'].length;
        temp.data['text_colors'][count] = addTextColor;
      }
      setTemporaryColorPalette(temp);
      updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
        setColorPalette(temp);
      });
    }
  }, [addTextColor, showAddTextColorPicker]);

  useEffect(() => {
    if (Object.keys(addGradientColor).length !== 0 && showAddGradientColorPicker != true) {
      const temp = { ...temporaryColorPalette };
      if (temp.data['gradient_colors'] == null) {
        temp.data['gradient_colors'] = [];
        temp.data['gradient_colors'].push(addGradientColor);
      } else {
        const count = temporaryColorPalette.data['gradient_colors'].length;
        temp.data['gradient_colors'][count] = addGradientColor;
      }
      setTemporaryColorPalette(temp);
      updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
        setColorPalette(temp);
      });
    }
  }, [addGradientColor, showAddGradientColorPicker]);

  useEffect(() => {
    if (description != '' && isDescriptionActive == false) {
      const temp = { ...temporaryColorPalette };
      temp.description = description;
      setTemporaryColorPalette(temp);
      updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
        setColorPalette(temp);
      });
    }
  }, [description, isDescriptionActive]);

  useEffect(() => {
    if (tags != '' && isTagActive == false) {
      const temp = { ...temporaryColorPalette };
      const arr = tags.split(', ');
      temp.tags = arr;
      setTemporaryColorPalette(temp);
      updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
        setColorPalette(temp);
      });
    }
  }, [tags, isTagActive]);

  useEffect(() => {
    const temp = temporaryColorPalette;
    temp['palette_type'] = paletteType.label;
    updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
      setColorPalette(temp);
    });
  }, [paletteType]);

  const createGradientTransformValuesFromGradient = (gradient) => {
    let shiftX = 0;
    let shiftY = 0;
    let scaleX = 1;
    let scaleY = 1;
    let rotationDegrees = 0;

    if (gradient.startsWith('linear-gradient')) {
      const angleRegex = /(\d+)deg/;
      const angleMatch = gradient.match(angleRegex);
      rotationDegrees = angleMatch ? parseInt(angleMatch[1]) : 0;
    } else if (gradient.startsWith('radial-gradient')) {
      const centerRegex = /at\s+(\w+(\s+\w+)*)/;
      const centerMatch = gradient.match(centerRegex);
      if (centerMatch) {
        const center = centerMatch[1];
        if (center === 'center') {
          shiftX = 0;
          shiftY = 0;
        } else {
          const positions = center.split(' ');
          if (positions.includes('left')) {
            shiftX = -1;
          } else if (positions.includes('right')) {
            shiftX = 1;
          }
          if (positions.includes('top')) {
            shiftY = -1;
          } else if (positions.includes('bottom')) {
            shiftY = 1;
          }
        }
      }

      const colorStopsRegex = /(\d+\.\d+)%/g;
      const colorStops = [...gradient.matchAll(colorStopsRegex)];
      if (colorStops.length > 0) {
        const radius = parseFloat(colorStops[colorStops.length - 1][1]) / 100;
        scaleX = radius; // Set scaleX based on the radius
        scaleY = radius; // Set scaleY based on the radius
      }
    }
    const cosTheta = Math.cos(rotationDegrees * (Math.PI / 180));
    const sinTheta = Math.sin(rotationDegrees * (Math.PI / 180));

    // Create the gradientTransform matrix
    const a = scaleX * cosTheta;
    const b = -scaleX * sinTheta;
    const c = scaleY * sinTheta;
    const d = scaleY * cosTheta;
    const e = shiftX;
    const f = shiftY;
    const gradientTransformMatrix = [
      [a, c, e],
      [b, d, f],
    ];
    return gradientTransformMatrix;
  };
  const convertToCirclePositionString = (shiftX, shiftY) => {
    if (shiftX === 0 && shiftY === 0) {
      return 'circle at center';
    } else if (shiftX === 0 && shiftY < 0) {
      return 'circle at top';
    } else if (shiftX === 0 && shiftY > 0) {
      return 'circle at bottom';
    } else if (shiftX < 0 && shiftY === 0) {
      return 'circle at left';
    } else if (shiftX > 0 && shiftY === 0) {
      return 'circle at right';
    } else if (shiftX < 0 && shiftY < 0) {
      return 'circle at left top';
    } else if (shiftX > 0 && shiftY < 0) {
      return 'circle at right top';
    } else if (shiftX < 0 && shiftY > 0) {
      return 'circle at left bottom';
    } else if (shiftX > 0 && shiftY > 0) {
      return 'circle at right bottom';
    } else {
      return 'unknown position';
    }
  };
  const convertGradientObject = (gradientObject) => {
    let gradientString = '';
    const a = gradientObject.gradientTransform[0][0];
    const b = gradientObject.gradientTransform[0][1];
    // const c = gradientObject.gradientTransform[1][0];
    // const d = gradientObject.gradientTransform[1][1];
    const shiftX = gradientObject.gradientTransform[0][2];
    const shiftY = gradientObject.gradientTransform[1][2];
    const rotationRadians = Math.atan2(b, a); // Calculate arctan(b/a) in radians
    const rotationDegrees = (rotationRadians * 180) / Math.PI;
    const circlePositionString = convertToCirclePositionString(shiftX, shiftY);

    // console.log("rotationDegrees", rotationDegrees);
    // console.log("circlePositionString", circlePositionString);

    if (gradientObject.type === 'GRADIENT_RADIAL') {
      gradientString += `radial-gradient(${circlePositionString},`;
    } else if (gradientObject.type === 'GRADIENT_LINEAR') {
      gradientString += `linear-gradient(${rotationDegrees}deg,`;
    }
    // Add gradient stops
    gradientObject.gradientStops.forEach((stop, index) => {
      if (index === gradientObject.gradientStops.length - 1) {
        gradientString += `${
          stop.color.a
            ? `rgba(${Math.round(stop.color.r * 255)}, ${Math.round(stop.color.g * 255)}, ${Math.round(
                stop.color.b * 255
              )}, ${stop.color.a})`
            : `rgb(${Math.round(stop.color.r * 255)}, ${Math.round(stop.color.g * 255)}, ${Math.round(
                stop.color.b * 255
              )})`
        } ${Math.round(stop.position * 100)}%`;
      } else {
        gradientString += `${
          stop.color.a
            ? `rgba(${Math.round(stop.color.r * 255)}, ${Math.round(stop.color.g * 255)}, ${Math.round(
                stop.color.b * 255
              )}, ${stop.color.a})`
            : `rgb(${Math.round(stop.color.r * 255)}, ${Math.round(stop.color.g * 255)}, ${Math.round(
                stop.color.b * 255
              )})`
        } ${Math.round(stop.position * 100)}%,`;
      }
    });

    // Add gradient transform if available
    // if (gradientObject.gradientTransform) {
    //   gradientString += `, ${JSON.stringify(gradientObject.gradientTransform)}`;
    // }

    // Add closing parenthesis
    gradientString += ')';

    return gradientString;
  };

  const parseGradient = (gradientValue: string) => {
    const gradientTypeMatch = gradientValue.match(/linear-gradient|radial-gradient/g);
    const gradientType = gradientTypeMatch
      ? gradientTypeMatch[0] === 'linear-gradient'
        ? 'GRADIENT_LINEAR'
        : 'GRADIENT_RADIAL'
      : 'GRADIENT_LINEAR';
    const stopRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*([\d.]+)?\)\s*([\d.]+)%/g;
    const gradientStops: GradientStop[] = [];
    let match;
    while ((match = stopRegex.exec(gradientValue)) !== null) {
      const color: Color = {
        r: parseFloat(match[1]) / 255.0,
        g: parseFloat(match[2]) / 255.0,
        b: parseFloat(match[3]) / 255.0,
        a: match[4] ? parseFloat(match[4]) : 1,
      };
      const position: number = parseFloat(match[5]) / 100;
      gradientStops.push({ color, position });
    }
    // console.log("form", createGradientTransformValuesFromGradient(gradientValue));
    const gradient: Gradient = {
      type: gradientType as 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL',
      gradientStops,
      gradientTransform: createGradientTransformValuesFromGradient(gradientValue),
      // gradientTransform : [
      //     [1, 0, 0],
      //     [0, 1, 0]
      // ]
    };
    return gradient;
  };
  const rgbToHex = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g);
    const rHex = Number(r).toString(16).padStart(2, '0');
    const gHex = Number(g).toString(16).padStart(2, '0');
    const bHex = Number(b).toString(16).padStart(2, '0');
    const hexColor = `#${rHex}${gHex}${bHex}`;

    return hexColor;
  };
  const handleColorChange = async (newColor: any, index, type) => {
    if (type === 'background') {
      const temp = colorPalette;
      temp.data['background_colors'][index] = rgbToHex(newColor);
      temp.type = 'figma';
      temp.palette_type = paletteType.label;
      setTemporaryColorPalette(temp);
    } else if (type === 'background_add') {
      setAddBackgroundColor(rgbToHex(newColor));
    } else if (type === 'text') {
      const temp = colorPalette;
      temp.data['text_colors'][index] = rgbToHex(newColor);
      temp.type = 'figma';
      temp.palette_type = paletteType.label;
      setTemporaryColorPalette(temp);
    } else if (type === 'text_add') {
      setAddTextColor(rgbToHex(newColor));
    } else if (type === 'gradient') {
      const temp = colorPalette;
      // console.log(newColor);
      temp.data['gradient_colors'][index] = parseGradient(newColor);
      setTemporaryColorPalette(temp);
    } else if (type === 'gradient_add') {
      setAddGradientColor(parseGradient(newColor));
    }
  };

  const handleContextMenu = (e: React.MouseEvent, index: string, type: string) => {
    e.preventDefault();
    if (type === 'background') {
      const temp = { ...temporaryColorPalette };
      temp.data['background_colors'].splice(parseInt(index), 1);
      setTemporaryColorPalette(temp);
      updateColorPalette(token.id_token, colorPaletteId, temp);
    } else if (type === 'text') {
      const temp = { ...temporaryColorPalette };
      temp.data['text_colors'].splice(parseInt(index), 1);
      setTemporaryColorPalette(temp);
      updateColorPalette(token.id_token, colorPaletteId, temp);
    } else if (type === 'gradient') {
      const temp = { ...temporaryColorPalette };
      temp.data['gradient_colors'].splice(parseInt(index), 1);
      setTemporaryColorPalette(temp);
      updateColorPalette(token.id_token, colorPaletteId, temp);
    }
  };
  const handleTagsChange = (event) => {
    setTags(event.target.value);
  };
  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };
  const handleDescriptionFocus = () => {
    setIsDescriptionActive(true);
  };
  const handleDescriptionBlur = () => {
    setIsDescriptionActive(false);
  };
  const handleTagFocus = () => {
    setIsTagActive(true);
  };
  const handleTagBlur = () => {
    setIsTagActive(false);
  };
  return (
    <div className="container color-palette-container">
      <div className="style-list">
        <span className="list-title">Palette Type</span>
        <Select
          className="dropdown"
          classNamePrefix="dropdown-content"
          maxMenuHeight={100}
          options={PALETTE_TYPES}
          value={paletteType}
          onChange={(option) => {
            setPaletteType(option);
          }}
        />
        {paletteType.value == 'B+T' ? (
          <>
            <div className="item-list">
              <span className="list-title">Background Colors</span>
              <div className="color-picker-list">
                {Object.entries(temporaryColorPalette.data['background_colors'] || {}).map(([index, color]) => (
                  <div key={index}>
                    <button
                      className="color-picker-container"
                      style={{ backgroundColor: `${color}` }}
                      onClick={() => {
                        setShowBackgroundColorPicker(!showBackgroundColorPicker);
                        setSelectedBackgroundColorId(index);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, index, 'background')}
                    ></button>
                    {showBackgroundColorPicker && selectedBackgroundColorId == index && (
                      <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2 }}>
                        <ReactGPicker
                          value={'#abcdef'}
                          showGradientMode={true}
                          showGradientPosition={true}
                          gradient={true}
                          defaultActiveTab="solid"
                          showGradientResult={true}
                          showGradientStops={true}
                          onChange={(color) => handleColorChange(color, index, 'background')}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className="plus-button"
                  key={'plus'}
                  value={'white'}
                  onClick={() => setShowAddBackgroundColorPicker(!showAddBackgroundColorPicker)}
                >
                  +
                </button>
                {showAddBackgroundColorPicker && (
                  <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2, marginTop: '30px' }}>
                    <ReactGPicker
                      value={'#abcdef'}
                      showGradientMode={true}
                      showGradientPosition={true}
                      gradient={true}
                      defaultActiveTab="solid"
                      showGradientResult={true}
                      showGradientStops={true}
                      onChange={(color) => handleColorChange(color, 0, 'background_add')}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="style-list">
              <span className="list-title">Text Colors</span>
              <div className="color-picker-list">
                {Object.entries(temporaryColorPalette.data['text_colors'] || {}).map(([index, color]) => (
                  <div key={index}>
                    <button
                      className="color-picker-container"
                      style={{ backgroundColor: `${color}` }}
                      onClick={() => {
                        setShowTextColorPicker(!showTextColorPicker);
                        setSelectedTextColorId(index);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, index, 'text')}
                    ></button>
                    {showTextColorPicker && selectedTextColorId == index && (
                      <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2 }}>
                        <ReactGPicker
                          value={'#ffffff'}
                          showGradientMode={true}
                          showGradientPosition={true}
                          gradient={true}
                          defaultActiveTab="solid"
                          showGradientResult={true}
                          showGradientStops={true}
                          onChange={(color) => handleColorChange(color, index, 'text')}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className="plus-button"
                  key={'plus'}
                  value={'white'}
                  onClick={() => setShowAddTextColorPicker(!showAddTextColorPicker)}
                >
                  +
                </button>
                {showAddTextColorPicker && (
                  <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2, marginTop: '30px' }}>
                    <ReactGPicker
                      value={'#ffffff'}
                      showGradientMode={true}
                      showGradientPosition={true}
                      gradient={true}
                      defaultActiveTab="solid"
                      showGradientResult={true}
                      showGradientStops={true}
                      onChange={(color) => handleColorChange(color, 0, 'text_add')}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="item-list">
              <span className="list-title">Background Colors</span>
              <div className="color-picker-list">
                {Object.entries(temporaryColorPalette.data['background_colors'] || {}).map(([index, color]) => (
                  <div key={index}>
                    <button
                      className="color-picker-container"
                      style={{ backgroundColor: `${color}` }}
                      onClick={() => {
                        setShowBackgroundColorPicker(!showBackgroundColorPicker);
                        setSelectedBackgroundColorId(index);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, index, 'background')}
                    ></button>
                    {showBackgroundColorPicker && selectedBackgroundColorId == index && (
                      <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2 }}>
                        <ReactGPicker
                          value={'#ffffff'}
                          showGradientMode={true}
                          showGradientPosition={true}
                          gradient={true}
                          defaultActiveTab="solid"
                          showGradientResult={true}
                          showGradientStops={true}
                          onChange={(color) => handleColorChange(color, index, 'background')}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className="plus-button"
                  key={'plus'}
                  value={'white'}
                  onClick={() => setShowAddBackgroundColorPicker(!showAddBackgroundColorPicker)}
                >
                  +
                </button>
                {showAddBackgroundColorPicker && (
                  <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2, marginTop: '30px' }}>
                    <ReactGPicker
                      value={'#ffffff'}
                      showGradientMode={true}
                      showGradientPosition={true}
                      gradient={true}
                      defaultActiveTab="solid"
                      showGradientResult={true}
                      showGradientStops={true}
                      onChange={(color) => handleColorChange(color, 0, 'background_add')}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="item-list">
              <span className="list-title">Gradient Colors</span>
              <div className="color-picker-list">
                {Object.entries(temporaryColorPalette.data['gradient_colors'] || {}).map(([index, color]) => (
                  <div key={index}>
                    <button
                      className="color-picker-container"
                      style={{ background: convertGradientObject(color) }}
                      onClick={() => {
                        setShowGradientColorPicker(!showGradientColorPicker);
                        setSelectedGradientColorId(index);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, index, 'gradient')}
                    ></button>
                    {showGradientColorPicker && selectedGradientColorId == index && (
                      <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2 }}>
                        <ReactGPicker
                          value={'#abcdef'}
                          showGradientMode={true}
                          showGradientPosition={true}
                          gradient={true}
                          defaultActiveTab="gradient"
                          showGradientResult={true}
                          showGradientStops={true}
                          onChange={(color) => handleColorChange(color, index, 'gradient')}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  className="plus-button"
                  key={'plus'}
                  value={'white'}
                  onClick={() => setShowAddGradientColorPicker(!showAddGradientColorPicker)}
                >
                  +
                </button>
                {showAddGradientColorPicker && (
                  <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2, marginTop: '30px' }}>
                    <ReactGPicker
                      value={'#abcdef'}
                      showGradientMode={true}
                      showGradientPosition={true}
                      gradient={true}
                      defaultActiveTab="gradient"
                      showGradientResult={true}
                      showGradientStops={true}
                      onChange={(color) => handleColorChange(color, 0, 'gradient_add')}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="style-list">
              <span className="list-title">Text Colors</span>
              <div className="color-picker-list">
                {Object.entries(temporaryColorPalette.data['text_colors'] || {}).map(([index, color]) => (
                  <div key={index}>
                    <button
                      className="color-picker-container"
                      style={{ backgroundColor: `${color}` }}
                      onClick={() => {
                        setShowTextColorPicker(!showTextColorPicker);
                        setSelectedTextColorId(index);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, index, 'text')}
                    ></button>
                    {showTextColorPicker && selectedTextColorId == index && (
                      <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2 }}>
                        <ReactGPicker
                          value={'#ffffff'}
                          showGradientMode={true}
                          showGradientPosition={true}
                          gradient={true}
                          defaultActiveTab="solid"
                          showGradientResult={true}
                          showGradientStops={true}
                          onChange={(color) => handleColorChange(color, index, 'text')}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  className="plus-button"
                  key={'plus'}
                  value={'white'}
                  onClick={() => setShowAddTextColorPicker(!showAddTextColorPicker)}
                >
                  +
                </button>
                {showAddTextColorPicker && (
                  <div className="color-picker-popover" style={{ position: 'absolute', zIndex: 2, marginTop: '30px' }}>
                    <ReactGPicker
                      value={'#ffffff'}
                      showGradientMode={true}
                      showGradientPosition={true}
                      gradient={true}
                      defaultActiveTab="solid"
                      showGradientResult={true}
                      showGradientStops={true}
                      onChange={(color) => handleColorChange(color, 0, 'text_add')}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="style-list">
        <span className="list-title">Description</span>
        <textarea
          className={`item-textarea ${isDescriptionActive ? 'active' : 'inactive'}`}
          placeholder={temporaryColorPalette.description}
          onFocus={handleDescriptionFocus}
          onBlur={handleDescriptionBlur}
          value={description}
          onChange={handleDescriptionChange}
        />
      </div>
      <div className="style-list">
        <span className="list-title">Tags</span>
        <textarea
          className={`item-textarea ${isTagActive ? 'active' : 'inactive'}`}
          placeholder={temporaryColorPalette.tags.join(', ')}
          onFocus={handleTagFocus}
          onBlur={handleTagBlur}
          value={tags}
          onChange={handleTagsChange}
        />
      </div>
    </div>
  );
};

export default ColorPaletteContainer;

import React, { useEffect, useState } from 'react';
import { updateFontFamily } from '../../services';
import Select from 'react-select';
import { PAIRING_TYPES } from '../../constants';
import filesData from '../../assets/figma.json';
import './index.scss';

const { files } = filesData;
const FontPairingContainer = ({ token, fontPairing, setFontPairing, fontPairingId }) => {
  const [pairingType, setPairingType] = useState(PAIRING_TYPES[0]);
  const [temporaryFontPairing, setTemporaryFontPairing] = useState(fontPairing);
  const [options, setOptions] = useState(
    Object.entries(files || {}).map(
      ([, file]: [string, { family: string; filename: string; style: string; weight: number }]) => ({
        label: file.family,
        value: file.filename,
        family: file.family,
        style: file.style,
        weight: file.weight,
        size: {
          min: 12,
          max: 72,
        },
      })
    )
  );
  const [tags, setTags] = useState(fontPairing.tags.join(', '));
  const [description, setDescription] = useState(fontPairing.description);
  const [isDescriptionActive, setIsDescriptionActive] = useState(false);
  const [isTagActive, setIsTagActive] = useState(false);

  useEffect(() => {
    if (fontPairing.pairing_type == 'sans_serif+serif') {
      setPairingType(PAIRING_TYPES[0]);
    } else {
      setPairingType(PAIRING_TYPES[1]);
    }
    setOptions(
      Object.entries(files || {}).map(
        ([, file]: [string, { family: string; filename: string; style: string; weight: number }]) => ({
          label: file.family,
          value: file.filename,
          family: file.family,
          style: file.style,
          weight: file.weight,
          size: {
            min: 12,
            max: 72,
          },
        })
      )
    );
  }, []);

  useEffect(() => {
    setTemporaryFontPairing(fontPairing);
  }, [fontPairing]);

  useEffect(() => {
    const temp = temporaryFontPairing;
    temp['pairing_type'] = pairingType.label;
    updateFontFamily(token.id_token, fontPairingId, temp);
    setFontPairing(temp);
  }, [pairingType]);

  useEffect(() => {
    if (description != '' && isDescriptionActive == false) {
      const temp = { ...temporaryFontPairing };
      temp.description = description;
      setTemporaryFontPairing(temp);
      updateFontFamily(token.id_token, fontPairingId, temp).then(() => {
        setFontPairing(temp);
      });
    }
  }, [description, isDescriptionActive]);

  useEffect(() => {
    if (tags != '' && isTagActive == false) {
      const temp = { ...temporaryFontPairing };
      const arr = tags.split(', ');
      temp.tags = arr;
      setTemporaryFontPairing(temp);
      updateFontFamily(token.id_token, fontPairingId, temp).then(() => {
        setFontPairing(temp);
      });
    }
  }, [tags, isTagActive]);
  const changeFontOptions = async (option, type) => {
    const temp = temporaryFontPairing;
    const newOption = {
      family: option.family,
      style: option.style,
      weight: option.weight,
      label: option.family,
      value: option.filename,
      size: option.size,
    };
    temp['pairing_type'] = pairingType.label;
    if (type === 'SS') {
      temp.data['sans_serif'][0] = newOption;
      setTemporaryFontPairing((prevState) => {
        return {
          ...prevState,
          data: {
            ...prevState.data,
            sans_serif: [newOption, ...prevState.data['sans_serif'].slice(1)],
          },
        };
      });
    } else if (type === 'S') {
      temp.data['serif'][0] = newOption;
      setTemporaryFontPairing((prevState) => {
        return {
          ...prevState,
          data: {
            ...prevState.data,
            serif: [newOption, ...prevState.data['serif'].slice(1)],
          },
        };
      });
    } else if (type === 'Mono') {
      temp.data['monospace'][0] = newOption;
      setTemporaryFontPairing((prevState) => {
        return {
          ...prevState,
          data: {
            ...prevState.data,
            monospace: [newOption, ...prevState.data['monospace'].slice(1)],
          },
        };
      });
    }

    updateFontFamily(token.id_token, fontPairingId, temp).then(() => {
      setFontPairing(temp);
    });
  };
  // const handleColorChange = async(newColor: any, index, type) => {
  //     if(type === "background"){
  //         const temp = colorPalette;
  //         temp.data["background_colors"][index] = newColor.hex;
  //         temp.type = "figma";
  //         setColorPalette(temp);
  //         updateColorPalette(token.id_token, colorPaletteId, temp);
  //     }else if(type === "background_add"){
  //         const temp = colorPalette;
  //         if(temp.data["background_colors"] == null){
  //             temp.data["background_colors"] = [];
  //             temp.data["background_colors"].push(newColor.hex);
  //         }else{
  //             temp.data["background_colors"][temp.data["background_colors"].length] = newColor.hex;
  //         }
  //         temp.type = "figma";
  //         updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
  //             setColorPalette(temp);
  //         });
  //     }else if(type === "text"){
  //         const temp = colorPalette;
  //         temp.data["text_colors"][index] = newColor.hex;
  //         temp.type = "figma";
  //         setColorPalette(temp);
  //         updateColorPalette(token.id_token, colorPaletteId, temp);
  //     }else if(type === "text_add"){
  //         const temp = colorPalette;
  //         if(temp.data["text_colors"] == null){
  //             temp.data["text_colors"] = [];
  //             temp.data["text_colors"].push(newColor.hex);
  //         }else{
  //             temp.data["text_colors"][temp.data["text_colors"].length] = newColor.hex;
  //         }
  //         temp.type = "figma";
  //         updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
  //             setColorPalette(temp);
  //         })
  //     }else if(type === "gradient"){
  //         const temp = colorPalette;
  //         temp.data["gradient_colors"][index] = newColor.hex;
  //         temp.type = "figma";
  //         setColorPalette(temp);
  //         updateColorPalette(token.id_token, colorPaletteId, temp);
  //     }else if(type === "gradient_add"){
  //         const temp = colorPalette;
  //         if(temp.data["gradient_colors"] == null){
  //             temp.data["gradient_colors"] = [];
  //             temp.data["gradient_colors"].push(newColor.hex);
  //         }else{
  //             temp.data["gradient_colors"][temp.data["gradient_colors"].length] = newColor.hex;
  //         }
  //         temp.type = "figma";
  //         updateColorPalette(token.id_token, colorPaletteId, temp).then(() => {
  //             setColorPalette(temp);
  //         })
  //     }

  //     setShowBackgroundColorPicker(false); // Hide the color picker after a color is selected
  //     setShowTextColorPicker(false);
  //     setShowGradientColorPicker(false);
  //     setShowAddBackgroundColorPicker(false); // Show the add color picker after a color changes
  //     setShowAddTextColorPicker(false);
  //     setShowAddGradientColorPicker(false);
  // };

  // const handleContextMenu = (e: React.MouseEvent, index: string, type:string) => {
  //     e.preventDefault();
  //     if(type === "background"){
  //         const temp = colorPalette;
  //         temp.data["background_colors"].splice(parseInt(index) , 1);
  //         temp.type = "figma";
  //         setColorPalette(temp);
  //         updateColorPalette(token.id_token, colorPaletteId, temp);
  //     } else if(type === "text"){
  //         const temp = colorPalette;
  //         temp.data["text_colors"].splice(parseInt(index) , 1);
  //         temp.type = "figma";
  //         setColorPalette(temp);
  //         updateColorPalette(token.id_token, colorPaletteId, temp);
  //     } else if(type === "gradient"){
  //         const temp = colorPalette;
  //         temp.data["gradient_colors"].splice(parseInt(index) , 1);
  //         temp.type = "figma";
  //         setColorPalette(temp);
  //         updateColorPalette(token.id_token, colorPaletteId, temp);
  //     }

  // };
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
        <span className="list-title">Pairing Type</span>
        <Select
          className="dropdown"
          classNamePrefix="dropdown-content"
          maxMenuHeight={100}
          options={PAIRING_TYPES}
          value={pairingType}
          onChange={(option) => {
            setPairingType(option);
          }}
        />
        {pairingType.value == 'ss' ? (
          <>
            <div className="item-list">
              <span className="list-title">Sans Serif</span>
              <Select
                className="dropdown"
                classNamePrefix="dropdown-content"
                maxMenuHeight={100}
                options={options}
                value={temporaryFontPairing.data['sans_serif'][0]}
                onChange={(option) => {
                  changeFontOptions(option, 'SS');
                }}
              />
            </div>
            <div className="item-list">
              <span className="list-title">Serif</span>
              <Select
                className="dropdown"
                classNamePrefix="dropdown-content"
                maxMenuHeight={100}
                options={options}
                value={temporaryFontPairing.data['serif'][0]}
                onChange={(option) => {
                  changeFontOptions(option, 'S');
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="item-list">
              <span className="list-title">Sans Serif</span>
              <Select
                className="dropdown"
                classNamePrefix="dropdown-content"
                maxMenuHeight={100}
                options={options}
                value={temporaryFontPairing.data['sans_serif'][0]}
                onChange={(option) => {
                  changeFontOptions(option, 'SS');
                }}
              />
            </div>
            <div className="item-list">
              <span className="list-title">Serif</span>
              <Select
                className="dropdown"
                classNamePrefix="dropdown-content"
                maxMenuHeight={100}
                options={options}
                value={temporaryFontPairing.data['serif'][0]}
                onChange={(option) => {
                  changeFontOptions(option, 'S');
                }}
              />
            </div>
            <div className="item-list">
              <span className="list-title">Monospace</span>
              <Select
                className="dropdown"
                classNamePrefix="dropdown-content"
                maxMenuHeight={100}
                options={options}
                value={temporaryFontPairing.data['monospace'][0]}
                onChange={(option) => {
                  changeFontOptions(option, 'Mono');
                }}
              />
            </div>
          </>
        )}
      </div>

      <div className="style-list">
        <span className="list-title">Description</span>
        <textarea
          className={`item-textarea ${isDescriptionActive ? 'active' : 'inactive'}`}
          placeholder={temporaryFontPairing.description}
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
          placeholder={temporaryFontPairing.tags.join(', ')}
          onFocus={handleTagFocus}
          onBlur={handleTagBlur}
          value={tags}
          onChange={handleTagsChange}
        />
      </div>
    </div>
  );
};

export default FontPairingContainer;

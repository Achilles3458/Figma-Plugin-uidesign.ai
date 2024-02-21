import { DownloadResponse } from "../ui/app_api"
import { EmanationSDKAssets, EmanationSDKEpoch } from "./types"

export async function extractEmanationSDKAssetsFromEpoch(epoch: EmanationSDKEpoch): Promise<EmanationSDKAssets> {
	const assets: EmanationSDKAssets = {}

	const app = epoch.apps[0]
	for (const screen of app.screens) {
		for (const key in screen.meta.theme.images) {
			const value = screen.meta.theme.images[key]

			switch (value.type) {
				case "PREPROCESSED": {
					const image = figma.getImageByHash(value.value.imageHash)
					if (image === null) {
						throw new Error("Internal error")
					}
					const bytes = await image.getBytesAsync()
					if (!(key in assets)) {
						assets[key] = [...bytes]
					}
					break
				}
				case "POSTPROCESSED": {
					const image = await figma.createImageAsync(value.value.url)
					if (image === null) {
						throw new Error("Internal error - image src")
					}
					const bytes = await image.getBytesAsync()
					if (!(key in assets)) {
						assets[key] = [...bytes]
					}
					break
				}
			}
		}
	}
	return assets
}

export async function extractEmanationSDKAssetsFromDownloadResponse(epoch: DownloadResponse): Promise<EmanationSDKAssets> {
	const assets: EmanationSDKAssets = {}

	const colorCollection = figma.variables.getLocalVariableCollections().find(collection => collection.name === "Colors") || figma.variables.createVariableCollection("Colors");

	for (const screen of epoch.screens) {
		for (const key in screen.meta.theme.images) {
			const value = screen.meta.theme.images[key]

			switch (value.type) {
				case "PREPROCESSED": {
					const image = figma.getImageByHash(value.value.imageHash)
					if (image === null) {
						throw new Error("Internal error")
					}
					const bytes = await image.getBytesAsync()
					if (!(key in assets)) {
						assets[key] = [...bytes]
					}
					break
				}
				case "POSTPROCESSED": {
					const image = await figma.createImageAsync(value.value.url)
					if (image === null) {
						throw new Error("Internal error - image src")
					}
					if (!(value.value.imageHash in assets)) {
						assets[value.value.imageHash] = image.hash
					}
					break
				}
			}
		}
		for (const key in screen.meta.theme.colors) {
			const value = screen.meta.theme.colors[key]

			const colorVariables = figma.variables.getLocalVariables("COLOR");
			const variable = colorVariables.find(x => x.name === `Color-${key}`);

			try {
				if (!variable) {
					const colorVariable = figma.variables.createVariable(`Color-${key}`, colorCollection.id, 'COLOR');
					colorVariable.setValueForMode(colorCollection.modes[0].modeId, {
							r: value.color.r,
							g: value.color.g,
							b: value.color.b,
							a: value.color.a || 1,
					})
					assets[key] = colorVariable.id;
				} else {
					assets[key] = variable.id;
				}
			} catch(e) {}
		}
	}
	return assets
}

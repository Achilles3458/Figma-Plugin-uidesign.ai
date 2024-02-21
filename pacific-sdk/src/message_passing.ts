import { EmanationSDKAssets, EmanationSDKEpoch, FigmaUser } from "./code/types"
import { DownloadResponse } from "./ui/app_api"

export type PostMessageToFigma =
	| {
		type:    "NOTIFY"
		payload: {
			message:  string
			timeout?: number
		}
	}
	| {
		type:    "NOTIFY_ERROR"
		payload: {
			message:  string
			timeout?: number
		}
	}
	| {
		type:    "CACHE_ALL"
		payload: {
			temperature: number
			threshold:   number
			timeout:     number
		}
	}
	| { type: "GENERATE_FINANCE_APP" }
	| { type: "GENERATE_SOCIAL_MEDIA_APP" }
	| { type: "GENERATE_ECOMMERCE_APP" }
	| { type: "GENERATE_TEST_APP" }
	| { type: "REGENERATE_FROM_SELECTION" }
	| { type: "LOG_SELECTION" }
	| { type: "UPLOAD_SELECTION" }
	| {
		type:    "DOWNLOAD"
		payload: DownloadResponse
	}

export type PostMessageToReact =
	| {
		type:    "INIT"
		payload: {
			currentUser: FigmaUser
			temperature: number
			threshold:   number
			timeout:     number
		}
	}
	| {
		type:    "UPLOAD"
		payload: {
			epoch:  EmanationSDKEpoch
			assets: EmanationSDKAssets
		}
	}

export function postMessageToFigma(message: PostMessageToFigma): void {
	console.log("[postMessageToFigma]", message) // DEBUG
	window.parent.postMessage({ pluginMessage: message }, "*")
}

export function postMessageToReact(message: PostMessageToReact): void {
	console.log("[postMessageToReact]", message) // DEBUG
	figma.ui.postMessage(message)
}

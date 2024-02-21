import React, { useEffect, useRef, useState } from "react"
import { FigmaUser } from "../code/types"
import { PostMessageToReact, postMessageToFigma } from "../message_passing"
import { endpointDownload, endpointUpload } from "./app_api"
import UIDesignAILogo from "./assets/images/uidesignai_logo.png"

export function App() {
	const [currentUser, setCurrentUser] = useState<FigmaUser | null>(null)

	const [prompt, setPrompt] = useState("")
	const [temperature, setTemperature] = useState(0)
	const [threshold, setThreshold] = useState(0)
	const [$$timeout, $$setTimeout] = useState(50)

	// "INIT" and "UPLOAD"
	useEffect(() => {
		async function handleMessage(e: MessageEvent<string | { pluginMessage: PostMessageToReact }>) {
			if (typeof e.data === "string") return

			const action = e.data.pluginMessage
			switch (action.type) {
				case "INIT":
					setCurrentUser(action.payload.currentUser)
					setTemperature(action.payload.temperature)
					setThreshold(action.payload.threshold)
					$$setTimeout(action.payload.timeout)
					break
				case "UPLOAD": {
					const response = await endpointUpload(action.payload)
					switch (response[0].code) {
						case -1:
							postMessageToFigma({
								type:    "NOTIFY_ERROR",
								payload: {
									message: "Network error. Please try again later",
								},
							})
							break
						case 201: {
							postMessageToFigma({
								type:    "NOTIFY",
								payload: {
									message: `Success! Created ${response[1]!.collection_id}`,
								},
							})
							break
						}
						case 400:
							postMessageToFigma({
								type:    "NOTIFY_ERROR",
								payload: {
									message: "Bad request. Please try again later",
								},
							})
							break
						case 403:
							postMessageToFigma({
								type:    "NOTIFY_ERROR",
								payload: {
									message: "Forbidden. Please try again later",
								},
							})
							break
						case 422:
							postMessageToFigma({
								type:    "NOTIFY_ERROR",
								payload: {
									message: "Unprocessable entity. Please try again later",
								},
							})
							break
						case 503:
							postMessageToFigma({
								type:    "NOTIFY_ERROR",
								payload: {
									message: "Server error. Please try again later",
								},
							})
							break
						default:
							postMessageToFigma({
								type:    "NOTIFY_ERROR",
								payload: {
									message: `Internal error. Please try again later`,
								},
							})
							break
					}
					break
				}
			}
		}
		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [currentUser])

	async function download() {
		const response = await endpointDownload({ prompt, temperature, threshold })
		switch (response[0].code) {
			case -1:
				postMessageToFigma({
					type:    "NOTIFY_ERROR",
					payload: {
						message: "Network error. Please try again later",
					},
				})
				break
			case 200: {
				postMessageToFigma({
					type:    "DOWNLOAD",
					payload: response[1]!,
				})
				break
			}
			case 400:
				postMessageToFigma({
					type:    "NOTIFY_ERROR",
					payload: {
						message: "Bad request. Please try again later",
					},
				})
				break
			case 403:
				postMessageToFigma({
					type:    "NOTIFY_ERROR",
					payload: {
						message: "Forbidden. Please try again later",
					},
				})
				break
			case 422:
				postMessageToFigma({
					type:    "NOTIFY_ERROR",
					payload: {
						message: "Unprocessable entity. Please try again later",
					},
				})
				break
			case 503:
				postMessageToFigma({
					type:    "NOTIFY_ERROR",
					payload: {
						message: "Server error. Please try again later",
					},
				})
				break
			default:
				postMessageToFigma({
					type:    "NOTIFY_ERROR",
					payload: {
						message: `Internal error. Please try again later`,
					},
				})
				break
		}
	}

	// "CACHE_ALL"
	const onceRef = useRef(false)
	useEffect(() => {
		if (!onceRef.current) {
			onceRef.current = true
			return
		}
		const timeout = setTimeout(() => {
			postMessageToFigma({
				type:    "CACHE_ALL",
				payload: {
					temperature,
					threshold,
					timeout: $$timeout,
				},
			})
		}, 50)
		return () => clearTimeout(timeout)
	}, [$$timeout, temperature, threshold])

	return (
		<>
			<form
				className="head"
				onSubmit={async e => {
					e.preventDefault()
					if (prompt === "") {
						postMessageToFigma({
							type:    "NOTIFY",
							payload: {
								message: "Please enter a prompt and try again",
							},
						})
						return
					}
					postMessageToFigma({
						type:    "NOTIFY",
						payload: {
							message: `Generating ${JSON.stringify(prompt)}...`,
							timeout: Number.POSITIVE_INFINITY,
						},
					})
					window.parent.postMessage({
						pluginMessage: {
							type:    "NOTIFY",
							payload: {
								message: `Generating ${JSON.stringify(prompt)}...`,
								timeout: Number.POSITIVE_INFINITY,
							},
						},
					}, "*")
					await download()
				}}
			>
				<img
					className="logo"
					src={UIDesignAILogo}
					alt="uidesign.ai logo"
				/>
				<div className="title_container">
					<div className="title">Prompt</div>
					<textarea
						id="prompt"
						className="prompt"
						value={prompt}
						onChange={e => setPrompt(e.target.value)}
						placeholder="make me a finance app"

						// Disable all the things
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck="false"
					></textarea>
				</div>
				<div className="prompt_details">
					<div className="title_container">
						<div className="title">Temp</div>
						<input
							type="number"
							min="0"
							max="1"
							step="0.01"
							value={temperature}
							onChange={e => setTemperature(e.currentTarget.valueAsNumber)}
						/>
					</div>
					<div className="title_container">
						<div className="title">Threshold</div>
						<input
							id="threshold"
							type="number"
							min="0"
							max="1"
							step="0.01"
							value={threshold}
							onChange={e => setThreshold(e.currentTarget.valueAsNumber)}
						/>
					</div>
					<div className="title_container">
						<div className="title">Timeout (ms)</div>
						<input
							id="timeout"
							type="number"
							min="0"
							max="500"
							value={$$timeout}
							onChange={e => $$setTimeout(e.currentTarget.valueAsNumber)}
						/>
					</div>
					<button className="button" type="submit">
						Submit
					</button>
				</div>
			</form>
			<div className="divider"></div>
			<div className="body">
				<div className="title_container">
					<div className="title">Examples</div>
					<button
						className="button"
						onClick={() => {
							postMessageToFigma({
								type: "GENERATE_FINANCE_APP",
							})
						}}
					>
						"make a finance app"
					</button>
				</div>
				<button
					className="button"
					onClick={() => {
						postMessageToFigma({
							type: "GENERATE_SOCIAL_MEDIA_APP",
						})
					}}
				>
					"make a social media app"
				</button>
				<button
					className="button"
					onClick={() => {
						postMessageToFigma({
							type: "GENERATE_ECOMMERCE_APP",
						})
					}}
				>
					"make an e-commerce app"
				</button>
				<button
					className="button"
					onClick={() => {
						postMessageToFigma({
							type: "GENERATE_TEST_APP",
						})
					}}
				>
					"make a test app"
				</button>
			</div>
			{/* {process.env.NODE_ENV === "development" && ( */}
				{/* <> */}
					<div className="divider"></div>
					<div className="body">
						<div className="title_container">
							<div className="title">Upload (internal use only)</div>
							<button
								className="button"
								onClick={() => {
									postMessageToFigma({
										type: "LOG_SELECTION",
									})
								}}
							>
								Log selection
							</button>
						</div>
						<button
							className="button"
							onClick={() => {
								postMessageToFigma({
									type: "REGENERATE_FROM_SELECTION",
								})
							}}
						>
							Regenerate from selection
						</button>
						<button
							className="button"
							onClick={() => {
								postMessageToFigma({
									type: "UPLOAD_SELECTION",
								})
							}}
						>
							Upload selection
						</button>
					</div>
				{/* </> */}
			{/* )} */}
		</>
	)
}

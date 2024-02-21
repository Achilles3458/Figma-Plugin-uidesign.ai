import * as z from "zod"
import { EmanationSDKAssets, EmanationSDKEpoch } from "../code/types"
import {
  StatusBadRequest,
  StatusCreated,
  StatusForbidden,
  StatusInternalError,
  StatusNetworkError,
  StatusOK,
  StatusResponseServerError,
  StatusUnprocessableEntity,
  statusBadRequest,
  statusCreated,
  statusForbidden,
  statusInternalError,
  statusNetworkError,
  statusOK,
  statusResponseServerError,
  statusUnprocessableEntity,
} from "./status"

// const ENDPOINT_UPLOAD_ASSETS = "http://localhost:8000/gen/v2/assets/images"
const ENDPOINT_UPLOAD_ASSETS = "https://api.uidesign.ai/gen/v2/assets/images"
// const ENDPOINT_UPLOAD_EPOCH   = "https://api.uidesign.ai/gen/v2/collections/bravo/"
const ENDPOINT_UPLOAD_EPOCH =
  "https://api.uidesign.ai/data/v3/user/figma/collections/"
// const ENDPOINT_UPLOAD_EPOCH =
// "http://localhost:8000/data/v3/user/figma/collections/"
// const ENDPOINT_DOWNLOAD_EPOCH =
// "http://localhost:8000/data/v3/generate/figma/app/"
const ENDPOINT_DOWNLOAD_EPOCH =
  "https://api.uidesign.ai/data/v3/generate/figma/app/"

const X_API_KEY = "ViKLiqvehwaZlGke4BnzI3V2uyRwfMqt5jrQ4z03"

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

const UploadAssetsResponseSchema = z.record(
  z.string(),
  z.object({
    url: z.string(),
    description: z.string(),
  })
)

export type UploadAssetsResponse = z.infer<typeof UploadAssetsResponseSchema>

const UploadResponseSchema = z.object({
  collection_id: z.string(),
})

export type UploadResponse = z.infer<typeof UploadResponseSchema>

export async function endpointUpload({
  epoch,
  assets,
}: {
  epoch: EmanationSDKEpoch
  assets: EmanationSDKAssets
}): Promise<
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
  let assetsResponse: Response
  try {
    assetsResponse = await fetch(ENDPOINT_UPLOAD_ASSETS, {
      method: "POST",
      headers: {
        "X-API-Key": X_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assets),
    })
  } catch (error) {
    return [statusNetworkError, null]
  }
  if (assetsResponse.status < 200 || assetsResponse.status >= 300) {
    switch (assetsResponse.status) {
      case 403:
        return [statusForbidden, null]
      case 422:
        return [statusUnprocessableEntity, null]
      case 503:
        return [statusResponseServerError, null]
      default:
        return [statusInternalError, null]
    }
  }
  const assetsResponseJSON = await assetsResponse.json()
  const safeAssetsResponseJSON =
    UploadAssetsResponseSchema.safeParse(assetsResponseJSON)
  if (!safeAssetsResponseJSON.success) {
    return [statusBadRequest, null]
  }

  // Mutate in place ...
  const app = epoch.apps[0]
  for (const screen of app.screens) {
    for (const key in screen.meta.theme.images) {
      if (key in safeAssetsResponseJSON.data) {
        screen.meta.theme.images[key] = {
          type: "POSTPROCESSED",
          value: {
            url: safeAssetsResponseJSON.data[key].url, // Overwrite value
            description: safeAssetsResponseJSON.data[key].description, // Overwrite value
          },
        }
      }
    }
  }
  // console.log(app) // DEBUG

  // Upload epoch ...
  let epochResponse: Response
  try {
    epochResponse = await fetch(ENDPOINT_UPLOAD_EPOCH, {
      method: "POST",
      headers: {
        "X-API-Key": X_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(epoch),
    })
  } catch (error) {
    return [statusNetworkError, null]
  }
  if (epochResponse.status < 200 || epochResponse.status >= 300) {
    switch (epochResponse.status) {
      case 403:
        return [statusForbidden, null]
      case 422:
        return [statusUnprocessableEntity, null]
      case 503:
        return [statusResponseServerError, null]
      default:
        return [statusInternalError, null]
    }
  }
  const epochResponseJSON = await epochResponse.json()
  const safeEpochResponseJSON =
    UploadResponseSchema.safeParse(epochResponseJSON)
  if (!safeEpochResponseJSON.success) {
    return [statusBadRequest, null]
  }
  return [statusCreated, safeEpochResponseJSON.data]
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

export type DownlodRequestBody = {
  prompt: string
  temperature: number
  threshold: number
}

const DownloadResponseScreenSchema = z.object({
  public: z.boolean(),

  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()).nullable(),
  url: z.string().nullable(),
  img_url: z.string().nullable(),
  root: z.any(),
  meta: z.record(z.any()),
})

const DownloadResponseScreensSchema = z.object({
  screens: z.array(z.any()),
  // screens: z.array(DownloadResponseScreenSchema),
})

export type DownloadResponse = z.infer<typeof DownloadResponseScreensSchema>

export async function endpointDownload(
  body: DownlodRequestBody
): Promise<
  | [StatusOK, DownloadResponse]
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
  let response: Response
  try {
    response = await fetch(ENDPOINT_DOWNLOAD_EPOCH, {
      method: "POST",
      headers: {
        "X-API-Key": X_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    return [statusNetworkError, null]
  }
  switch (response.status) {
    case 200: {
      const body = await response.json()
      const result = DownloadResponseScreensSchema.safeParse(body)
      if (result.success) {
        return [statusOK, result.data]
      } else {
        console.error(result.error)
        return [statusBadRequest, null]
      }
    }
    case 403:
      return [statusForbidden, null]
    case 422:
      return [statusUnprocessableEntity, null]
    case 503:
      return [statusResponseServerError, null]
    default:
      return [statusInternalError, null]
  }
}

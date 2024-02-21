# Emanation AI Figma Plugin SDK

This is a prerelease version of the Emanation AI Figma Plugin SDK. Here be dragons.

Architecture:

The "SDK" is comprised of two parts: The API and the library. The API is simply an endpoint that accepts an authorization header and body. The body consists of three required parameters: `prompt`, `temperature`, `threshold`. Upon success, you will receive an arbitrary JSON payload that you hand off to the library. The library will then paint the JSON payload to the Figma canvas. Additionally, when painting to the canvas, you can fine-tune the `timeout` delay.

### Steps:

1. Install the Figma plugin library (this package: `@emanation/pacific`) into your Figma plugin project.
2. Make a POST request to the Emanation AI endpoint with your prompt and prompt configuration.
3. Call the library to handle rendering to the Figma canvas

## Step 1: Install the Figma plugin library

Install the Figma plugin library by one of the following commands:

```sh
npm i @emanation/pacific
# Or yarn add @emanation/pacific
```

## Step 2: Make a POST request with the Emanation AI endpoints

The endpoint is `https://api.uidesign.ai/gen/v1/design/bravo/` Note that the trailing `/` is required.

When making fetch requests in a Figma plugin, note that Figma may block outgoing and incoming requests due to plugin permissions. See [`networkAccess`](https://www.figma.com/plugin-docs/manifest/#networkaccess) for reference. In short, you may need to whitelist `https://api.uidesign.ai/gen/v1/design/bravo/` in your Figma plugin's `manifest.json` file.

The fetch request should look something like this:

```ts
const response = await fetch("https://api.uidesign.ai/gen/v1/design/bravo/", {
  method:  "POST",
  headers: {
    "X-API-Key":    "foo-bar-baz-123", // <- Your API key
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
})
// Hand off the result to the Figma plugin library
```

Finally, the shape of `body` is as follows:

```ts
export type DownlodRequestBody = {
  prompt:      string
  temperature: number // A floating point number between 0-1
  threshold:   number // A floating point number between 0-1
}
```

Some examples of prompts:

- `a personal finance app for managing your wallet`
- `a travel based social media app`
- `a minimal, eco-friendly e-commerce app`

Note that prompts may be short or long.

For the time being, you may set temperature and threshold to `0`.

Please plan for one of the following status codes:

- 200: Success
- 403: Unauthorized
- 422: Unprocessable Entity
- 503: Internal Server Error

This is how we internally test `https://api.uidesign.ai/gen/v2/design/bravo/` for reference:

```ts
import * as z from "zod"
// ...

export type DownlodRequestBody = {
  prompt:      string
  temperature: number
  threshold:   number
}

const DownloadResponseScreenSchema = z.object({
  public: z.boolean(),

  name:        z.string(),
  description: z.string(),
  tags:        z.array(z.string()).nullable(),
  url:         z.string().nullable(),
  img_url:     z.string().nullable(),
  root:        z.any(),
  meta:        z.record(z.any()),
})

const DownloadResponseScreensSchema = z.object({
  screens: z.array(DownloadResponseScreenSchema),
})

export type DownloadResponse = z.infer<typeof DownloadResponseScreensSchema>
export async function getEmanationPayload(body: EmanationSDKBody): Promise<
  | [StatusOK, EmanationResponse]
  | [
    | StatusNetworkError
    | StatusBadRequest
    | StatusForbidden
    | StatusUnprocessableEntity
    | StatusResponseServerError
    | StatusInternalError,
    null
  ]
> {
  let response: Response
  try {
    response = await fetch("https://api.uidesign.ai/gen/v2/design/bravo/", {
      method:  "POST",
      headers: {
        "X-API-Key":    "foo-bar-baz-123", // <- Your API key
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body), // <- Your prompt, temperature, and threshold (object)
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
    case 403: return [statusForbidden, null]
    case 422: return [statusUnprocessableEntity, null]
    case 503: return [statusResponseServerError, null]
    default:  return [statusInternalError, null]
  }
}
```

Note that Zod validation is not required. Your implementation simply needs to make the fetch request with the correct headers and body and hand off to the Figma library.

### Step 3: Call the Figma library to handle rendering to the Figma canvas

The library exports one function you will need to hand off the arbitrary JSON payload to: `drawScreens`. This is an asynchronous function accepts the JSON payload and a configuration object that accepts `timeout`. You don't need to do anything to the JSON payload except forward it as is as the first argument to `drawScreens`. The second argument accepts `timeout` which controls the drawing speed. For shorter drawings, set `timeout` to `0`. For longer drawings, set `timeout` to `50`, `100`, or `200` for example. Internally, we found about 50-75ms feels right.

Note that even if you set `timeout` to `0`, there will be a slight delay.

Finally, we recommend adding some additional code before and after calling `drawScreens`:

- Notify the user they are making a generation. For example, we recommend ```figma.notify(`Generating ${JSON.stringify(prompt)}`, { timeout: Number.POSITIVE_INFINITY })```. This is because the fetch request may take 0.5-2s to complete.

- Notify the user the generation is done. For example ```figma.notify(`Generated ${JSON.stringify(prompt)}!`)```. You don't need to set an explicit timeout for this notification because it's intended to be short lived.

For reference, here's how you might structure your `code.ts`:

```ts
figma.ui.onmessage = async (action: PostMessageToFigma) => {
  switch (action.type) {
    // ...
    case "DRAW_SCREENS": {
      const handler = figma.notify(`Generating ${JSON.stringify(prompt)}`, { timeout: Number.POSITIVE_INFINITY })
      await drawScreens(response, { timeout: 50 })
      handler.cancel()
      figma.notify(`Generated ${JSON.stringify(prompt)}!`)
      break
    }
    // ...
  }
}
```

Ideally, the ```figma.notify(`Generating ${JSON.stringify(prompt)}`, { timeout: Number.POSITIVE_INFINITY })``` should actually before the fetch request, not after. This is because the fetch request may take 0.5-2s to resolve. We use the following code so that `ui.html` may dispatch controlled notifications to `code.ts`:

```ts
// notify.ts
let _handler: NotificationHandler | null = null

export function clearNotify(): void {
  if (_handler !== null) _handler.cancel()
}

export function notify(
  message:     string,
  { timeout }: { timeout?: number } = { timeout: 5_000 },
): NotificationHandler {
  if (_handler !== null) _handler.cancel()
  console.log(`[notify] ${JSON.stringify(message)}`)
  _handler = figma.notify(message, { timeout })
  return _handler
}

export function notifyError(
  message:     string,
  { timeout }: { timeout?: number } = { timeout: 10_000 },
): NotificationHandler {
  if (_handler !== null) _handler.cancel()
  console.error(`[notifyError] ${JSON.stringify(message)}`)
  _handler = figma.notify(message, { timeout, error: true })
  return _handler
}

// code.ts
figma.ui.onmessage = async (action: PostMessageToFigma) => {
  switch (action.type) {
    case "NOTIFY":
      notify(action.payload.message, {
        timeout: action.payload.timeout,
      })
      break
    case "NOTIFY_ERROR":
      notifyError(action.payload.message, {
        timeout: action.payload.timeout,
      })
      break
    // ...
  }
}
```

Then we can simply write the following in `ui.html` to communicate as eagerly as possible:

```ts
// ...
window.parent.postMessage({
  pluginMessage: {
    type:    "NOTIFY",
    payload: {
      message: `Generating ${JSON.stringify(prompt)}...`,
      timeout: Number.POSITIVE_INFINITY,
    },
  },
}, "*")
// ...
```

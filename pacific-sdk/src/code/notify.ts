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

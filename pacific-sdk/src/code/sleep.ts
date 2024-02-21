export async function sleep(durationMilliseconds: number): Promise<void> {
	return await new Promise(resolve => setTimeout(resolve, durationMilliseconds))
}

export const fastClone = (data: any) => (typeof data === 'symbol' ? null : JSON.parse(JSON.stringify(data)));

export declare interface EmanationSDKScreen {
	name:        string;
	description: string;
	tags:        string[] | null;
	url:         string | null;
	img_url:     string | null;
	root?:       any;
	meta:        Record<string, any>;
}

export declare interface EmanationSDKEpoch {
	result: EmanationSDKScreen[];
}

export declare function drawScreens(epoch: EmanationSDKEpoch, settings: { timeout: number }): Promise<void>;

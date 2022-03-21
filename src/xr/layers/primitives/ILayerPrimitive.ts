import type { Texture, Transform } from "ogl";

export interface ILayerPrimitive<T extends object = any> extends Transform {
	eye: 'none' | 'left' | 'right';
	texture: Texture<any>;
	alphaOnly: boolean;
	apply(options: T);
}

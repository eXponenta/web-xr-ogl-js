import type { Texture, Transform } from 'ogl';

export interface ILayerPrimitive<T extends object = any> extends Transform {
	eye: 'none' | 'left' | 'right';
	texture: Texture<any>;
	maskMode: 'none' | 'alpha' | 'depth';
	apply(options: T);
}

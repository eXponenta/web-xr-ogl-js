import { Mesh, Plane } from 'ogl';
import type { IQuadLayerInit } from 'webxr';
import { ILayerPrimitive } from './ILayerPrimitive';
import { PrimitiveMaterial } from './PrimitiveMaterial';

export interface IQuadPrimitiveInit {
	width?: number;
	height?: number;
}

export class QuadPrimitive extends Mesh<Plane, PrimitiveMaterial> implements ILayerPrimitive<IQuadLayerInit> {
	_renderOrder: number;

	options: IQuadLayerInit;

	constructor(context: GLContext, options: IQuadLayerInit = {} as any) {
		super(context, {
			// WebXR Layers size is in 2 times more that our
			geometry: new Plane(context, { width: 2, height: 2 }),
			program: new PrimitiveMaterial(context, null),
		});
		this.options = options;
		this._renderOrder = 0;
	}

	set renderOrder(v) {
		this._renderOrder = v;
	}

	get renderOrder() {
		return this.maskMode !== 'none' ? 0 : this._renderOrder;
	}

	set maskMode(v: 'depth' | 'alpha' | 'none') {
		this.program.maskMode = v;
	}

	get maskMode() {
		return this.program.maskMode;
	}

	set eye(v: 'none' | 'left' | 'right') {
		if (this.options?.layout?.includes('stereo')) {
			this.program.forcedEye = null;
			this.program.eye = v;
		} else {
			this.program.forcedEye = 'none';
		}
	}

	get eye() {
		return this.program.eye;
	}

	set texture(v) {
		this.program.texture = v;
	}

	get texture() {
		return this.program.texture;
	}

	apply({ width = 1, height = 1 }: IQuadPrimitiveInit) {
		this.scale.set(width, height, 1);
	}
}

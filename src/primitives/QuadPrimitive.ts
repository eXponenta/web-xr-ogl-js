import { Mesh, Plane, Texture, Transform } from "ogl";
import { PrimitiveMaterial } from "./PrimitiveMaterial";

export interface ILayerPrimitive extends Transform {
	eye: 'none' | 'left' | 'right';
	texture: Texture<any>;
	alphaOnly: boolean;
}

export class QuadPrimitive extends Mesh <Plane, PrimitiveMaterial>  implements ILayerPrimitive {
	constructor(
		context: GLContext,
		options: { width?: number; height?: number } = {}
	) {
		super(context, {
			geometry: new Plane(context, {
				width: options.width * 2,
				height: options.height * 2,
			}),
			program: new PrimitiveMaterial(context, null),
		});
	}

	set alphaOnly (v: boolean) {
		this.program.alphaOnly = v;
	}

	get alphaOnly() {
		return this.program.alphaOnly;
	}

	set eye(v: 'none' | 'left' | 'right') {
		this.program.eye = v;
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
}

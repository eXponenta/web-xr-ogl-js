import { Mesh, Plane } from "ogl";
import { ILayerPrimitive } from "./ILayerPrimitive";
import { PrimitiveMaterial } from "./PrimitiveMaterial";

export interface IQuadPrimitiveInit {
	width?: number;
	height?: number;
}

export class QuadPrimitive extends Mesh <Plane, PrimitiveMaterial>  implements ILayerPrimitive <IQuadPrimitiveInit> {
	constructor(
		context: GLContext,
		options: IQuadPrimitiveInit = {}
	) {
		super(context, {
			// WebXR Lyaers size is twise more that our
			geometry: new Plane(context, { width: 2, height: 2}),
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

	apply({ width = 1, height = 1 }: IQuadPrimitiveInit) {
		this.scale.set(width, height, 1);
	}
}

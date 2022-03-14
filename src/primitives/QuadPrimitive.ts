import { Mesh, Plane } from "ogl";
import { PrimitiveMaterial } from "./PrimitiveMaterial";

export class QuadPrimitive extends Mesh {
	constructor(
		context: GLContext,
		options: { width?: number; height?: number; color?: Array<number> } = {}
	) {
		super(context, {
			geometry: new Plane(context, {width: options.width * 2, height: options.height * 2}),
			program: new PrimitiveMaterial(context, {
				uniforms: { uColor: { value: options.color || [0, 1, 0] } },
			}),
		});
	}
}

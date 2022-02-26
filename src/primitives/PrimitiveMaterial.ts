import { Program } from "ogl";
const vertex = /* glsl */ `
	attribute vec3 position;
	attribute vec3 normal;
	uniform mat4 modelViewMatrix;
	uniform mat4 projectionMatrix;
	uniform mat3 normalMatrix;
	varying vec3 vNormal;
	void main() {
		vNormal = normalize(normalMatrix * normal);
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const fragment = /* glsl */ `
	precision highp float;
	uniform vec3 uColor;

	varying vec3 vNormal;

	void main() {
		vec3 normal = normalize(vNormal);
		float lighting = dot(normal, normalize(vec3(-0.3, 0.8, 0.6)));
		gl_FragColor.rgb = uColor + lighting * 0.1;
		gl_FragColor.a = 1.0;
	}
`;

export class PrimitiveProgram extends Program {
	constructor (context: GLContext, uniforms = {}) {
		super (context, {
			vertex,
			fragment,
			transparent: true,
			// Don't cull faces so that plane is double sided - default is gl.BACK
			cullFace: null,
			uniforms: uniforms
		});
	}

	static instance: PrimitiveProgram;
	static create (gl: GLContext, uniforms = {}) {
		if (this.instance) {
			return this.instance;
		}

		return this.instance = new PrimitiveProgram(gl, uniforms);
	}
}

export class PrimitiveMaterial {
	public readonly program: Program;
	public readonly uniforms: Record<string, any>;

	constructor(context: GLContext, {
		program,
		uniforms = {}
	}: { program?: Program, uniforms?: any } = {}) {

		this.uniforms = uniforms;
		this.program = program || PrimitiveProgram.create(context, this.uniforms);
	}

	use (options: any) {
		const orig = this.program.uniforms;

		this.program.uniforms = this.uniforms;
		this.program.use (options);

		this.program.uniforms = orig;
	}

	// trap required data to programm
	get attributeLocations() {
		return this.program.attributeLocations;
	}
}

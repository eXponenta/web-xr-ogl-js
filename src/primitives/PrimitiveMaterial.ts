import { Program, Texture } from "ogl";
const vertex = /* glsl */ `
	attribute vec3 position;
	attribute vec3 normal;
	attribute vec2 uv;

	uniform mat4 modelViewMatrix;
	uniform mat4 projectionMatrix;
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const fragment = /* glsl */ `
	precision highp float;
	uniform sampler2D uTexture;
	uniform float uEye;

	varying vec2 vUv;

	void main() {
		vec2 uv = vUv;

		if (uEye > 0.0) {
			uv.x = clamp(0.0, 1., 2.0 * uv.x - (uEye));
		}

		gl_FragColor = texture2D(uTexture, uv);
	}
`;

const alphaOnlyFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;

void main() {
	gl_FragColor = vec4(0.0);
}
`;

/**
 * Special shader for allowing depth sorting of nativ layers because standar layer not support it
 */
export class AlphaOnlyProgram extends Program {
	constructor(context: GLContext) {
		super(context, {
			vertex: vertex,
			fragment: alphaOnlyFragment,
			transparent: false,
			depthTest: true,
			depthWrite: true
		});
	}

	static instance: AlphaOnlyProgram;
	static create(gl: GLContext) {
		if (this.instance) {
			return this.instance;
		}

		return (this.instance = new AlphaOnlyProgram(gl));
	}
}
export class PrimitiveProgram extends Program {
	constructor(context: GLContext, uniforms = {}) {
		super(context, {
			vertex,
			fragment,
			transparent: true,
			// Don't cull faces so that plane is double sided - default is gl.BACK
			cullFace: null,
			uniforms: Object.assign(
				{},
				{ uTexture: { value: null }, uEye: { value: -1 } },
				uniforms || {}
			),
		});
	}

	static instance: PrimitiveProgram;
	static create(gl: GLContext, uniforms = {}) {
		if (this.instance) {
			return this.instance;
		}

		return (this.instance = new PrimitiveProgram(gl, uniforms));
	}
}

const EYE_SIDE_MAP = {
	'none' : -1,
	'left' : 0,
	'right': 1
};

export class PrimitiveMaterial {
	public static emptyTexture: Texture;
	private readonly _alphaProgram: Program;
	private readonly _baseProgram: Program;

	program: Program;

	readonly uniforms: Record<string, any>;

	texture: Texture<any>;
	eye: keyof typeof EYE_SIDE_MAP = 'none';

	constructor(
		context: GLContext,
		texture: Texture<any> = null
	) {
		this.uniforms = {
			uTexture: {
				value: texture,
			},
			uEye: {
				value: -1
			}
		};

		this.texture = texture || (PrimitiveMaterial.emptyTexture || (PrimitiveMaterial.emptyTexture = new Texture(context)));
		this._baseProgram = this.program = PrimitiveProgram.create(context, this.uniforms);
		this._alphaProgram = AlphaOnlyProgram.create(context);
	}

	/**
	 * Alpha only setter swich program to Alpha, wich allow render only alpha (fully transparent)
	 * Needed for sorting a layers
	 */
	set alphaOnly(v: boolean) {
		this.program = v ? this._alphaProgram : this._baseProgram;
	}

	get alphaOnly() {
		return this.program === this._alphaProgram;
	}

	use(options: any) {

		this.uniforms.uTexture.value = this.texture || PrimitiveMaterial.emptyTexture;
		this.uniforms.uEye.value = EYE_SIDE_MAP[this.eye] ?? EYE_SIDE_MAP.none;

		const orig = this.program.uniforms;

		this.program.uniforms = this.uniforms;
		this.program.use(options);

		this.program.uniforms = orig;
	}

	// trap required data to programm
	get attributeLocations() {
		return this.program.attributeLocations;
	}
}

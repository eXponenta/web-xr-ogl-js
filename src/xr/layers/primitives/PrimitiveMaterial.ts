/* eslint-disable no-use-before-define */
/* eslint-disable max-classes-per-file */
import { Texture } from 'ogl';
import { ExtendedProgram } from './../../core/ExtendedProgram';

const vertex = /* glsl */ `#version 300 es
	in vec3 position;
	in vec3 normal;
	in vec2 uv;

	uniform mat4 viewMatrix;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;

	out vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
	}
`;

const fragment = /* glsl */ `#version 300 es
	precision highp float;
	uniform sampler2D uTexture;
	uniform float uEye;
	uniform float uAlphaClip;

	in vec2 vUv;
	out vec4 color;

	void main() {
		vec2 uv = vUv;

		if (uEye > -1.0) {
			uv.x = clamp(0.0, 1., 0.5 * (uv.x + uEye));
		}

		color = texture(uTexture, uv);

		if (uAlphaClip > 0.0) {
			if (color.a < uAlphaClip) discard;

			color *= 0.0;
		}
	}
`;

const EYE_SIDE_MAP = {
	none: -1,
	left: 0,
	right: 1,
};

export class PrimitiveMaterial extends ExtendedProgram<'uTexture' | 'uEye' | 'uAlphaClip'> {
	public static emptyTexture: Texture;

	texture: Texture<any>;

	eye: keyof typeof EYE_SIDE_MAP = 'none';

	forcedEye: keyof typeof EYE_SIDE_MAP | null = 'none';

	_maskMode: 'none' | 'alpha' | 'depth' = 'none';

	cachedBlendState = null;

	// MUST BE
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	constructor(context: GLContext, texture: Texture<any> = null) {
		const uniforms = {
			uTexture: {
				value: texture,
			},
			uEye: {
				value: -1,
			},
			uAlphaClip: {
				value: 0,
			},
		};

		super(context, { depthTest: true, transparent: true, cullFace: null, fragment, vertex, uniforms });

		this.texture =
			texture || PrimitiveMaterial.emptyTexture || (PrimitiveMaterial.emptyTexture = new Texture(context));

		this.cachedBlendState = { ...this.blendFunc };
		this.maskMode = 'none';
		this.depthTest = true;
	}

	/**
	 * Alpha only setter switch program to Alpha, witch allow render only alpha (fully transparent)
	 * Needed for sorting a layers
	 */
	set maskMode(v: 'depth' | 'alpha' | 'none') {
		this._maskMode = v;
		this.updateClipState();
	}

	get maskMode() {
		return this._maskMode;
	}

	updateClipState() {
		if (this._maskMode === 'alpha') {
			this.setBlendFunc(
				WebGLRenderingContext.prototype.ZERO,
				WebGLRenderingContext.prototype.ONE_MINUS_SRC_ALPHA,
				WebGLRenderingContext.prototype.ZERO, // use only source alpha
				WebGLRenderingContext.prototype.ONE_MINUS_SRC_ALPHA, // not needed alpha from destination
			);
			this.transparent = true;
		} else {
			this.setBlendFunc(
				this.cachedBlendState.src,
				this.cachedBlendState.dst,
				this.cachedBlendState.srcAlpha,
				this.cachedBlendState.dstAlpha,
			);
		}

		this.uniforms.uAlphaClip.value = this._maskMode === 'depth' ? 0.5 : 0;
		this.transparent = this._maskMode !== 'depth';
	}

	use(options: any) {
		this.uniforms.uTexture.value = this.texture || PrimitiveMaterial.emptyTexture;
		this.uniforms.uEye.value = EYE_SIDE_MAP[this.forcedEye || this.eye] ?? EYE_SIDE_MAP.none;

		super.use(options);
	}
}

/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-multi-assign */
import { IImageSource, Texture } from 'ogl';
import type { XRWebGLSubImage } from 'webxr';
import type { XRRenderer } from './XRRenderer';

type framebufferTexture2DParams = Parameters<WebGLRenderingContextBase['framebufferTexture2D']>;
type extParams = [samples: number];

interface IMSAATextureExtension {
	framebufferTexture2DMultisampleEXT: (...param: [...framebufferTexture2DParams, ...extParams]) => void;
}

export class XRRenderTarget {
	static USE_MSAA_TEXTURE_WHEN_EXIST = true;

	isMSAA = false;

	readonly context: XRRenderer;

	readonly supportsInvalidateFramebuffer = /OculusBrowser/g.test(navigator.userAgent);

	viewport: {
		x: number;
		y: number;
		width: number;
		height: number;
	} = null;

	buffer: WebGLFramebuffer;

	target: number;

	subImageAttachment: XRWebGLSubImage;

	referencedTexture: Texture<IImageSource>;

	renderBuffers: Array<WebGLRenderbuffer> = [];

	copyBuffer: WebGLFramebuffer;

	ignoreDepthValue = false;

	msaaTextureExtension?: IMSAATextureExtension;

	constructor(context: XRRenderer) {
		this.context = context;
		this.target = context.gl.FRAMEBUFFER;
		this.buffer = context.gl.createFramebuffer();

		// @see
		// https://github.com/oframe/ogl/blob/master/src/core/Renderer.js#L214
		this.msaaTextureExtension = XRRenderTarget.USE_MSAA_TEXTURE_WHEN_EXIST
			? context.getExtension<IMSAATextureExtension>('WEBGL_multisampled_render_to_texture')
			: null;
	}

	get depth() {
		return !!this.depthTexture;
	}

	get width(): number {
		return this.subImageAttachment ? this.subImageAttachment.viewport.width : this.referencedTexture?.width || 0;
	}

	get height(): number {
		return this.subImageAttachment ? this.subImageAttachment.viewport.height : this.referencedTexture?.height || 0;
	}

	get isVirtual(): boolean {
		return !this.subImageAttachment && !!this.referencedTexture;
	}

	get texture(): WebGLTexture {
		return this.subImageAttachment?.colorTexture || this.referencedTexture?.texture;
	}

	get depthTexture(): WebGLTexture {
		return this.subImageAttachment?.depthStencilTexture;
	}

	attach(subImage: XRWebGLSubImage, msaa = false) {
		const mssaChanged = msaa !== this.isMSAA;

		if (!mssaChanged) {
			if (subImage === this.subImageAttachment) {
				return;
			}

			if (subImage.colorTexture === this.subImageAttachment?.colorTexture) {
				this.subImageAttachment = subImage;
				return;
			}
		}

		const { gl } = <{ gl: WebGL2RenderingContext }>this.context;

		const { msaaTextureExtension } = this;

		this.isMSAA = msaa;

		this.subImageAttachment = subImage;

		if (this.renderBuffers.length > 0) {
			this.renderBuffers.forEach((buffer) => gl.deleteRenderbuffer(buffer));
			this.renderBuffers = [];
		}

		// we not require copy buffer for msaa texture
		if (msaa && !msaaTextureExtension && !this.copyBuffer) {
			this.copyBuffer = gl.createFramebuffer();
		} else if (this.copyBuffer) {
			gl.deleteFramebuffer(this.copyBuffer);
			this.copyBuffer = null;
		}

		if (this.copyBuffer) {
			this.context.bindFramebuffer({
				buffer: this.copyBuffer,
				target: gl.FRAMEBUFFER,
			});
		} else {
			this.context.bindFramebuffer({
				buffer: this.buffer,
				target: gl.FRAMEBUFFER,
			});
		}

		if (msaaTextureExtension && msaa) {
			msaaTextureExtension.framebufferTexture2DMultisampleEXT(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				subImage.colorTexture,
				0,
				4,
			);
		} else {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, subImage.colorTexture, 0);
		}

		if (subImage.depthStencilTexture) {
			if (msaaTextureExtension && msaa) {
				msaaTextureExtension.framebufferTexture2DMultisampleEXT(
					gl.FRAMEBUFFER,
					gl.DEPTH_ATTACHMENT,
					gl.TEXTURE_2D,
					subImage.depthStencilTexture,
					0,
					4,
				);
			} else {
				gl.framebufferTexture2D(
					gl.FRAMEBUFFER,
					gl.DEPTH_ATTACHMENT,
					gl.TEXTURE_2D,
					subImage.depthStencilTexture,
					0,
				);
			}
		}

		if (this.referencedTexture) {
			this.copyFrom(this.referencedTexture);
		}

		/**
		 * MSAA on render buffers
		 */
		if (msaa && !msaaTextureExtension) {
			const samples = gl.getParameter(gl.MAX_SAMPLES);
			// bind MSAA buffer
			this.context.bindFramebuffer(this);

			const rb = (this.renderBuffers[0] = gl.createRenderbuffer());

			gl.bindRenderbuffer(gl.RENDERBUFFER, rb);

			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);

			gl.renderbufferStorageMultisample(
				gl.RENDERBUFFER,
				samples,
				gl.RGBA8,
				subImage.textureWidth,
				subImage.textureHeight,
			);

			if (subImage.depthStencilTexture) {
				const rb = (this.renderBuffers[1] = gl.createRenderbuffer());

				gl.bindRenderbuffer(gl.RENDERBUFFER, rb);

				gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

				gl.renderbufferStorageMultisample(
					gl.RENDERBUFFER,
					samples,
					gl.DEPTH_COMPONENT24,
					subImage.textureWidth,
					subImage.textureHeight,
				);
			}
		}

		this.context.bindFramebuffer();
		this.referencedTexture = null;
	}

	copyFrom(texture: Texture<IImageSource>): void {
		if (!texture.texture || texture.width * texture.width <= 0) {
			return;
		}

		if (!this.subImageAttachment) {
			this.referencedTexture = texture;
		}

		const { gl } = this.context;

		this.context.bindFramebuffer({
			buffer: this.isMSAA ? this.copyBuffer : this.buffer,
			target: gl.FRAMEBUFFER,
		});

		// be sure that texture is actual
		texture.update();
		texture.bind();

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);

		this.context.bind2DTextureDirect(this.subImageAttachment.colorTexture);

		gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.width, this.height);

		// revert back
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.subImageAttachment.colorTexture,
			0,
		);

		// unbind state
		this.context.bindFramebuffer();
	}

	blit() {
		if (!this.isMSAA || this.msaaTextureExtension) {
			return;
		}

		const { gl } = <{ gl: WebGL2RenderingContext }>this.context;
		const { textureHeight, textureWidth } = this.subImageAttachment;

		this.context.bindFramebuffer({ target: gl.READ_FRAMEBUFFER, buffer: this.buffer });
		this.context.bindFramebuffer({ target: gl.DRAW_FRAMEBUFFER, buffer: this.copyBuffer });

		let blitMask = gl.COLOR_BUFFER_BIT;

		if (this.ignoreDepthValue === false) {
			// eslint-disable-next-line no-bitwise
			blitMask |= gl.DEPTH_BUFFER_BIT;
		}

		gl.blitFramebuffer(0, 0, textureWidth, textureHeight, 0, 0, textureWidth, textureHeight, blitMask, gl.NEAREST);

		if (this.supportsInvalidateFramebuffer) {
			const invalidation = this.ignoreDepthValue
				? [gl.DEPTH_ATTACHMENT, gl.COLOR_ATTACHMENT0]
				: [gl.COLOR_ATTACHMENT0];
			gl.invalidateFramebuffer(gl.FRAMEBUFFER, invalidation);
			gl.invalidateFramebuffer(gl.READ_FRAMEBUFFER, invalidation);
		}

		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		// unbind state
		this.context.bindFramebuffer();
	}

	destroy() {
		if (!this.buffer) {
			return;
		}

		const { gl } = this.context;

		gl.deleteFramebuffer(this.buffer);

		this.copyBuffer && gl.deleteFramebuffer(this.copyBuffer);
		this.renderBuffers.forEach((rb) => {
			gl.deleteRenderbuffer(rb);
		});

		this.subImageAttachment = null;
		this.target = 0;
		this.viewport = null;
		this.referencedTexture = null;
		this.copyBuffer = null;
		this.buffer = null;
		this.renderBuffers = [];
	}
}

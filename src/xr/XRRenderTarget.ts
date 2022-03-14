import { IImageSource, Texture } from "ogl";
import type { XRWebGLSubImage } from "webxr";
import { XRRenderer } from "./XRRenderer";

export class XRRenderTarget {
	isMSAA = false;

	readonly context: XRRenderer;

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

	constructor(context: XRRenderer) {
		this.context = context;
		this.target = context.gl.FRAMEBUFFER;
		this.buffer = context.gl.createFramebuffer();
	}

	get width(): number {
		return this.subImageAttachment
			? this.subImageAttachment.viewport.width
			: this.referencedTexture?.width || 0;
	}

	get height(): number {
		return this.subImageAttachment
			? this.subImageAttachment.viewport.height
			: this.referencedTexture?.height || 0;
	}

	get isVirtual(): boolean {
		return !this.subImageAttachment && !!this.referencedTexture;
	}

	get texture(): WebGLTexture {
		return (
			this.subImageAttachment?.colorTexture ||
			this.referencedTexture?.texture
		);
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

		this.isMSAA = msaa;
		this.subImageAttachment = subImage;

		if (this.renderBuffers.length > 0) {
			this.renderBuffers.forEach((buffer) =>
				gl.deleteRenderbuffer(buffer)
			);
			this.renderBuffers = [];
		}

		if (this.isMSAA && !this.copyBuffer) {
			this.copyBuffer = gl.createFramebuffer();
		}

		/**
		 * Create NON MSAA buffer and bind it
		 *
		 */
		this.context.bindFramebuffer({
			buffer: this.isMSAA ? this.copyBuffer : this.buffer,
			target: gl.FRAMEBUFFER,
		});

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			subImage.colorTexture,
			0
		);

		if (subImage.depthStencilTexture) {
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.DEPTH_ATTACHMENT,
				gl.TEXTURE_2D,
				subImage.depthStencilTexture,
				0
			);
		}

		if (this.referencedTexture) {
			this.copyFrom(this.referencedTexture);
		}

		/**
		 * MSAA
		 */

		if (this.isMSAA) {
			const samples = gl.getParameter(gl.MAX_SAMPLES);
			// bind MSAA buffer
			this.context.bindFramebuffer(this);

			let rb = (this.renderBuffers[0] = gl.createRenderbuffer());

			gl.bindRenderbuffer(gl.RENDERBUFFER, rb);

			gl.framebufferRenderbuffer(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.RENDERBUFFER,
				rb
			);

			gl.renderbufferStorageMultisample(
				gl.RENDERBUFFER,
				samples,
				gl.RGBA8,
				subImage.textureWidth,
				subImage.textureHeight
			);

			if (subImage.depthStencilTexture) {
				let rb = (this.renderBuffers[1] = gl.createRenderbuffer());

				gl.bindRenderbuffer(gl.RENDERBUFFER, rb);

				gl.framebufferRenderbuffer(
					gl.FRAMEBUFFER,
					gl.DEPTH_STENCIL_ATTACHMENT,
					gl.RENDERBUFFER,
					rb
				);

				gl.renderbufferStorageMultisample(
					gl.RENDERBUFFER,
					samples,
					gl.DEPTH24_STENCIL8,
					subImage.textureWidth,
					subImage.textureHeight
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

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			texture.texture,
			0
		);

		this.context.bind2DTextureDirect(this.subImageAttachment.colorTexture);

		gl.copyTexSubImage2D(
			gl.TEXTURE_2D,
			0,
			0,
			0,
			0,
			0,
			this.width,
			this.height
		);

		// revert back
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.subImageAttachment.colorTexture,
			0
		);

		// unbind state
		this.context.bindFramebuffer();
	}

	blit() {
		if (!this.isMSAA) {
			return;
		}

		const { gl } = <{ gl: WebGL2RenderingContext }>this.context;
		const {
			textureHeight, textureWidth
		} = this.subImageAttachment;

		this.context.bindFramebuffer({target: gl.READ_FRAMEBUFFER, buffer: this.buffer});
		this.context.bindFramebuffer({target: gl.DRAW_FRAMEBUFFER, buffer: this.copyBuffer});

		gl.blitFramebuffer(
			0, 0, textureWidth, textureHeight,
			0, 0, textureWidth, textureHeight,
			gl.COLOR_BUFFER_BIT,
			gl.NEAREST
		);

		// unbind state
		this.context.bindFramebuffer();
	}

	destroy() {
		if (!this.buffer) {
			return;
		}

		const  {
			gl
		} = this.context;

		gl.deleteFramebuffer(this.buffer);

		this.copyBuffer && gl.deleteFramebuffer(this.copyBuffer);
		this.renderBuffers.forEach(rb => {
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

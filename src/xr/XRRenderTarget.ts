import { IImageSource, Texture } from "ogl";
import type { XRWebGLSubImage } from "webxr";
import { XRRenderer } from "./XRRenderer";

export class XRRenderTarget {
	context: XRRenderer;

	viewport: {
		x: number, y: number, width: number, height: number
	} = null;

	buffer: WebGLFramebuffer;

	target: number;

	subImageAttachment: XRWebGLSubImage;

	referencedTexture: Texture<IImageSource>;

	constructor (context: XRRenderer, buffer?: WebGLFramebuffer) {
		this.context = context;
		this.target = context.gl.FRAMEBUFFER;
		this.buffer = buffer || context.gl.createFramebuffer();
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
		return this.subImageAttachment?.colorTexture || this.referencedTexture?.texture;
	}

	get depthTexture(): WebGLTexture {
		return this.subImageAttachment?.depthStencilTexture;
	}

	attach(subImage: XRWebGLSubImage) {
		if (subImage === this.subImageAttachment) {
			return;
		}

		this.subImageAttachment = subImage;

		this.context.bindFramebuffer(this);

		const {
			gl
		} = this.context;

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, subImage.colorTexture, 0);

		if (subImage.depthStencilTexture) {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, subImage.depthStencilTexture, 0)
		}

		if (this.referencedTexture) {
			this.copyFrom(this.referencedTexture);
		}

		this.referencedTexture = null;
	}

	copyFrom (texture: Texture <IImageSource>): void {
		if (!texture.texture || texture.width * texture.width <= 0) {
			return;
		}

		if (!this.subImageAttachment) {
			this.referencedTexture = texture;
		}

		const {
			gl
		} = this.context;

		this.context.bindFramebuffer(this);

		// be sure that texture is actual
		texture.update();
		texture.bind();

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);

		gl.bindTexture (gl.TEXTURE_2D, this.subImageAttachment.colorTexture);

		gl.copyTexSubImage2D(
			gl.TEXTURE_2D,
			0, 0, 0, 0, 0, this.width, this.height
		);

		// revert back
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.subImageAttachment.colorTexture, 0);

		// unbind state
		this.context.bindFramebuffer();
	}

	destroy () {
		if (!this.buffer) {
			return;
		}

		this.context.gl.deleteFramebuffer(this.buffer);
		this.subImageAttachment = null;
		this.target = 0;
		this.viewport = null;
		this.referencedTexture = null;
	}
}

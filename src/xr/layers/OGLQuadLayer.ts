import type { IQuadLayerInit, XRFrame, XRQuadLayer } from 'webxr';

import { QuadPrimitive, ILayerPrimitive } from './primitives';
import { OGLXRLayer } from './OGLXRLayer';

export class OGLQuadLayer extends OGLXRLayer<XRQuadLayer, IQuadLayerInit> implements IQuadLayerInit {
	public readonly type: 'cube' | 'quad' | 'none' = 'quad';

	constructor(options: IQuadLayerInit) {
		// force RGBA
		super({... options, colorFormat: WebGLRenderingContext.prototype.RGBA });

		this.initDone();
	}

	protected onTextureUpdate(): void {
		super.onTextureUpdate();

		const t = this._texture;

		if (!t) {
			return;
		}

		if (!this.useContentSize) {
			return;
		}

		const { width, height } = this._texture;

		if (width * height > 0 && this.viewPixelWidth !== width && this.viewPixelHeight !== height) {
			this.viewPixelHeight = height;
			this.viewPixelWidth = width;

			// eslint-disable-next-line no-console
			console.debug(`[Quad ${this.label}] Will update dimension follow texture size:`, width, height);
		}
	}

	public get isValid(): boolean {
		// layer can be valid only with valid dimensions
		// layer that less that 100 pixels area can't allocate native
		return (
			this.options.width * this.options.height > 0 &&
			this.options.viewPixelHeight * this.options.viewPixelWidth > 100
		);
	}

	public set layout(v: IQuadLayerInit['layout']) {
		this.options.layout = v;
		this.dimensionsDirty = true;
	}

	public get layout() {
		return this.options.layout;
	}

	public set width(v: number) {
		this.options.width = v;
		this.dimensionsDirty = true;
	}

	public get width() {
		return this.options.width;
	}

	public set height(v: number) {
		this.options.height = v;
		this.dimensionsDirty = true;
	}

	public get height() {
		return this.options.height;
	}

	public set viewPixelWidth(v: number) {
		this.options.viewPixelWidth = v;
		this.dimensionsDirty = true;
		this.layerNeedReconstruct = true;
	}

	public get viewPixelWidth() {
		return this.options.viewPixelWidth;
	}

	public set viewPixelHeight(v: number) {
		this.options.viewPixelHeight = v;
		this.dimensionsDirty = true;
		this.layerNeedReconstruct = true;
	}

	public get viewPixelHeight() {
		return this.options.viewPixelHeight;
	}

	protected _createClipMesh(): ILayerPrimitive {
		return new QuadPrimitive(this.context.gl, this.options);
	}

	protected _updateNative(frame: XRFrame = null): void {
		super._updateNative(frame);

		this.nativeLayer.transform = this.nativeTransform;

		const redrawContent = this.contentDirty || this._texture?.needsUpdate;

		if ((this.nativeLayer.needsRedraw || redrawContent) && frame && this._texture) {
			if (!this.options.layout?.includes('stereo')) {
				this.getRenderTarget(frame, 'none').copyFrom(this._texture);
			} else {
				for (const key of ['left', 'right'] as const) {
					this.getRenderTarget(frame, key).copyFrom(this._texture);
				}
			}

			this.contentDirty = false;
		}
	}
}

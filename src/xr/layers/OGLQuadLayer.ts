import type {
	IQuadLayerInit,
	XRFrame,
	XRQuadLayer,
} from "webxr";

import { QuadPrimitive, ILayerPrimitive } from "./primitives";
import { OGLXRLayer } from "./OGLXRLayer";

export class OGLQuadLayer extends OGLXRLayer<XRQuadLayer, IQuadLayerInit> implements IQuadLayerInit {
	public readonly type: "cube" | "quad" | "none" = "quad";

	constructor(options: IQuadLayerInit) {
		super(options);

		this.initDone();
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

	public set viewPixelWidth (v: number) {
		this.options.viewPixelWidth = v;
		this.dimensionsDirty = true;
	}

	public get viewPixelWidth() {
		return this.options.viewPixelWidth;
	}

	public set viewPixelHeight(v: number) {
		this.options.viewPixelHeight = v;
		this.dimensionsDirty = true;
	}

	public get viewPixelHeight() {
		return this.options.viewPixelHeight;
	}

	protected _createClipMesh(): ILayerPrimitive {
		return new QuadPrimitive(
			this.context.gl, this.options
		);
	}

	protected _updateNative(frame: XRFrame = null): void {
		super._updateNative(frame);

		this.nativeLayer.transform = this.nativeTransform;

		if ((this.nativeLayer.needsRedraw || this.contentDirty) && frame && this.texture) {

			if (!this.options.layout?.includes('stereo')) {
				this.getRenderTarget(frame, 'none').copyFrom(this.texture);;
			} else {
				for(let key of ['left', 'right'] as const) {
					this.getRenderTarget(frame, key).copyFrom(this.texture);
				}
			}

			this.contentDirty = false;
		}
	}
}

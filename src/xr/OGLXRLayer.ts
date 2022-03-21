import { Texture, Transform, IImageSource, Quat, Vec3 } from "ogl";
import type {
	IQuadLayerInit,
	XRCompositionLayer,
	XRFrame,
	XRQuadLayer,
	XRRigidTransform,
} from "webxr";

import { ILayerPrimitive, QuadPrimitive } from "../primitives/QuadPrimitive";
import type { XRRenderer } from "./XRRenderer";
import { XRRenderTarget } from "./XRRenderTarget";

const tmpQuat = new Quat();
const tmpPos = new Vec3();

export class OGLXRLayer<
	T extends XRCompositionLayer = XRCompositionLayer,
	V = any
> extends Transform {
	static context: XRRenderer;

	protected _context: XRRenderer;

	id: number = 0;

	options: V;

	nativeLayer: T;

	nativeTransform: XRRigidTransform;

	clipMesh: ILayerPrimitive;

	targets: Record<string, XRRenderTarget> = {};

	depthClip: boolean = true;

	dirty: boolean = false;

	texture: Texture<IImageSource> = null;

	/**
	 * @deprecated See texture
	 */
	get referencedTexture() {
		return this.texture;
	}

	/**
	 * @deprecated See texture
	 */
	set referencedTexture(v) {
		this.texture = v;
	}

	onLayerDestroy: (layer: this, nativeOnly: boolean) => void;

	readonly type: "cube" | "quad" | "none" = "none";

	transformDirty: boolean = true;

	constructor(options: V) {
		super();

		this.options = options;
		this._context = (this.constructor as typeof OGLXRLayer).context;

		if (!this._context) {
			throw new Error('Layer not registered in XRRendere or called before init');
		}

		this.onLayerDestroy = () => {};
	}

	protected initDone() {
		this.id = this._context.registerLayer(this);

		this.createClipMesh();
	}

	get isNative() {
		return !!this.nativeLayer;
	}

	protected _removeClipMesh(layers: ILayerPrimitive): void {}

	protected _createClipMesh(): ILayerPrimitive {
		throw new Error("Not implemented");
	}

	getRenderTarget(
		frame: XRFrame,
		eye: "left" | "right" | "none" = "none"
	): XRRenderTarget {
		const target = this.targets[eye] || new XRRenderTarget(this._context);

		target.referencedTexture = this.texture;
		target.attach(
			this._context.xr.glBinding.getSubImage(
				this.nativeLayer as XRCompositionLayer,
				frame,
				eye
			)
		);

		this.targets[eye] = target;

		return target;
	}

	// bind layer, if layer is null - native will be unbound and dropeed
	bindLayer(layer: T | null) {
		if (this.nativeLayer && this.nativeLayer !== layer) {
			this.onLayerDestroy?.(this, true);
			this.destroyNative();
		}

		if (layer) {
			this.nativeLayer = layer;
			this._updateNative(null);
		}

		this.createClipMesh();

		// if layer is presented, use clip mesh only as depth clipper
		this.clipMesh.alphaOnly = !!layer;
		this.clipMesh.visible = !layer || this.depthClip;
	}

	protected _updateClipMesh(frame: XRFrame) {
		// no update when not exis
		if (!this.nativeLayer) {
			return;
		}

		this.clipMesh.texture = this.referencedTexture;
	}

	protected _updateNative(frame: XRFrame = null) {
		// we can pool it, XRRig not allow pooling
		// need has a invalidate stat, but this is not implemented

		if (this.transformDirty || !this.nativeTransform) {

			this.updateMatrixWorld(false);

			this.worldMatrix.getRotation(tmpQuat);
			this.worldMatrix.getTranslation(tmpPos);

			this.nativeTransform = new self.XRRigidTransform(tmpPos,tmpQuat);
		}
	}

	update(frame: XRFrame) {
		this.clipMesh && this._updateClipMesh(frame);
		this.nativeLayer && this._updateNative(frame);
	}

	needUpdateTransform() {
		this.transformDirty = true;
	}

	destroyNative() {
		if (this.nativeLayer) {
			this.nativeLayer.destroy();
		}

		this.nativeLayer = null;
		this.nativeTransform = null;
	}

	createClipMesh() {
		if (this.clipMesh) {
			return;
		}

		this.clipMesh = this._createClipMesh();

		if (this.clipMesh) {
			this.addChild(this.clipMesh);
			this._updateClipMesh(null);
		}
	}

	destroyClipMesh() {
		if (!this.clipMesh) {
			return;
		}

		this._removeClipMesh(this.clipMesh);
		this.clipMesh?.setParent(null);
		this.clipMesh = null;
	}

	destroy() {
		this.onLayerDestroy?.(this, false);
		this.destroyNative();

		for(let key in this.targets) {
			this.targets[key].destroy();
		}

		this.targets = null;
		this.texture = null;
	}
}

export class OGLQuadLayer extends OGLXRLayer<XRQuadLayer, IQuadLayerInit> {
	readonly type: "cube" | "quad" | "none" = "quad";

	constructor(options: IQuadLayerInit) {
		super(options);

		this.initDone();
	}

	set width(v: number) {
		this.nativeLayer.width = v;
	}

	get width() {
		return this.nativeLayer.width;
	}

	set height(v: number) {
		this.nativeLayer.height = v;
	}

	get height() {
		return this.nativeLayer.height;
	}


	protected _createClipMesh(): ILayerPrimitive {
		return new QuadPrimitive(
			this._context.gl, this.options
		);
	}

	_updateNative(frame: XRFrame = null): void {
		super._updateNative(frame);

		this.nativeLayer.transform = this.nativeTransform;

		if ((this.nativeLayer.needsRedraw || this.dirty) && frame && this.texture) {

			if (!this.options.layout?.includes('stereo')) {
				this.getRenderTarget(frame, 'none').copyFrom(this.texture);;
			} else {
				for(let key of ['left', 'right'] as const) {
					this.getRenderTarget(frame, key).copyFrom(this.texture);
				}
			}

			this.dirty = false;
		}
	}
}

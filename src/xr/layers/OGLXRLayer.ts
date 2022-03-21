import { Texture, Transform, IImageSource, Quat, Vec3 } from "ogl";
import * as WEBXR from "webxr";
import { XRRenderTarget } from "../XRRenderTarget";

import type { ILayerPrimitive } from "./primitives/";
import type { XRRenderer } from "../XRRenderer";

const tmpQuat = new Quat();
const tmpPos = new Vec3();

export class OGLXRLayer<T extends WEBXR.XRCompositionLayer = WEBXR.XRCompositionLayer, V = any> extends Transform {

	static context: XRRenderer;

	public readonly options: V;

	public readonly type: "cube" | "quad" | "none" = "none";

	public id: number = 0;

	public depthClip: boolean = true;

	public contentDirty: boolean = false;

	/**
	 * @deprecated
	 * @see contentDirty
	 */
	public set dirty(v) {
		this.contentDirty = true;
	}

	public get dirty() {
		return this.contentDirty;
	}

	public texture: Texture<IImageSource> = null;

	/**
	 * @deprecated See texture
	 */
	public get referencedTexture() {
		return this.texture;
	}

	/**
	 * @deprecated See texture
	 */
	public set referencedTexture(v) {
		this.contentDirty = this.contentDirty || v !== this.texture || v.needsUpdate;
		this.texture = v;
	}


	public get isNative() {
		return !!this.nativeLayer;
	}

	/* internal */ nativeLayer: T;

	/* internal */ nativeTransform: WEBXR.XRRigidTransform;

	protected dimensionsDirty = false;

	protected transformDirty: boolean = true;

	protected clipMesh: ILayerPrimitive;

	protected targets: Record<string, XRRenderTarget> = {};

	protected context: XRRenderer;

	/* internal */ onLayerDestroy: (layer: this, nativeOnly: boolean) => void;

	constructor(options?: V) {
		super();

		this.options = options || {} as V;
		this.context = (this.constructor as typeof OGLXRLayer).context;

		if (!this.context) {
			throw new Error('Layer not registered in XRRendere or called before init');
		}

		this.onLayerDestroy = () => { };
	}

	protected initDone() {
		this.id = this.context.registerLayer(this);

		this.createClipMesh();
	}

	protected _syncWithNative() {
		if (!this.nativeLayer) {
			return;
		}

		for (let key in this.nativeLayer) {
			if (key in this.options) {
				this.nativeLayer[key] = (this.options as any)[key];
			}
		}

		this.nativeLayer.transform = this.nativeTransform;
	}

	protected _removeClipMesh(layers: ILayerPrimitive): void { }

	protected _createClipMesh(): ILayerPrimitive {
		throw new Error("Not implemented");
	}

	public getRenderTarget(
		frame: WEBXR.XRFrame,
		eye: "left" | "right" | "none" = "none"
	): XRRenderTarget {
		const target = this.targets[eye] || new XRRenderTarget(this.context);

		target.referencedTexture = this.texture;
		target.attach(
			this.context.xr.glBinding.getSubImage(
				this.nativeLayer as WEBXR.XRCompositionLayer,
				frame,
				eye
			)
		);

		this.targets[eye] = target;

		return target;
	}

	// bind layer, if layer is null - native will be unbound and dropeed
	/* internal */ bindLayer(layer: T | null) {
		if (this.nativeLayer && this.nativeLayer !== layer) {
			this.onLayerDestroy?.(this, true);
			this._destroyNative();
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

	protected _updateClipMesh(frame: WEBXR.XRFrame) {
		// no update when not exis
		if (this.nativeLayer) {
			return;
		}

		if (this.dimensionsDirty) {
			this.clipMesh.apply(this.options);
		}

		this.clipMesh.texture = this.texture;
	}

	protected _updateNative(frame: WEBXR.XRFrame = null) {
		// we can pool it, XRRig not allow pooling
		// need has a invalidate stat, but this is not implemented
		if (this.transformDirty || !this.nativeTransform) {

			this.updateMatrixWorld(false);

			this.worldMatrix.getRotation(tmpQuat);
			this.worldMatrix.getTranslation(tmpPos);

			this.nativeTransform = new self.XRRigidTransform(tmpPos, tmpQuat);
		}

		if (this.dimensionsDirty && this.nativeLayer) {
			this._syncWithNative();
		}
	}

	public update(frame: WEBXR.XRFrame) {
		this.clipMesh && this._updateClipMesh(frame);
		this.nativeLayer && this._updateNative(frame);
		// should be applied in top
		this.dimensionsDirty = false;
	}

	public needUpdateTransform() {
		this.transformDirty = true;
	}

	protected _destroyNative() {
		this.nativeLayer = null;
		this.nativeTransform = null;
	}

	protected createClipMesh() {
		if (this.clipMesh) {
			return;
		}

		this.clipMesh = this._createClipMesh();

		if (this.clipMesh) {
			this.addChild(this.clipMesh);
			this._updateClipMesh(null);
		}
	}

	protected destroyClipMesh() {
		if (!this.clipMesh) {
			return;
		}

		this._removeClipMesh(this.clipMesh);
		this.clipMesh?.setParent(null);
		this.clipMesh = null;
	}

	public destroy() {
		this.onLayerDestroy?.(this, false);
		this._destroyNative();

		for (let key in this.targets) {
			this.targets[key].destroy();
		}

		this.targets = null;
		this.texture = null;
	}

	public dispose() {
		this.destroy();
	}
}

/* eslint-disable no-restricted-globals */
import { Texture, Transform, IImageSource, Quat, Vec3 } from 'ogl';
import type * as WEBXR from 'webxr';
import { XRRenderTarget } from '../XRRenderTarget';

import type { ILayerPrimitive } from './primitives';
import type { XRRenderer } from '../XRRenderer';

const tmpQuat = new Quat();
const tmpPos = new Vec3();

let ID = 0;

export class OGLXRLayer<T extends WEBXR.XRCompositionLayer = WEBXR.XRCompositionLayer, V = any> extends Transform {
	static ALLOW_NATIVE = true;

	static ALLOW_ALPHA_CLIP = true;

	static context: XRRenderer;

	public readonly options: V;

	public readonly type: 'cube' | 'quad' | 'none' = 'none';

	public willRender = true;

	public id = 0;

	public contentDirty = false;

	public useNative = true;

	public clipMode: 'alpha' | 'depth' = 'alpha';

	// update layer pixel size depends of texture that attached to it
	public useContentSize = false;

	// marked when needs call onLayerConstruct
	protected _needsCallReconstruct = false;

	// called when layer was update by any reason
	// or when native layer was constructed
	public onLayerConstruct: () => void = null;

	private _label: string;

	public set label(v) {
		this._label = v || `layer_${this.id}_${this.type}`;
	}

	public get label() {
		return this._label;
	}

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

	public _texture: Texture<IImageSource> = null;

	public get texture() {
		return this._texture;
	}

	public set texture(v) {
		this.contentDirty = this.contentDirty || v !== this._texture || v?.needsUpdate;

		this._attachTexture(v);
	}

	public get isNative() {
		return !!this.nativeLayer;
	}

	/* internal */ nativeLayer: T;

	/* internal */ nativeTransform: WEBXR.XRRigidTransform;

	protected dimensionsDirty = false;

	protected transformDirty = true;

	// marked when native layers must be reallocated
	protected layerNeedReconstruct = false;

	protected clipMesh: ILayerPrimitive;

	protected targets: Record<string, XRRenderTarget> = {};

	protected context: XRRenderer;

	/* internal */ onLayerDestroy: (layer: this, nativeOnly: boolean) => void;

	constructor(options?: V) {
		super();

		this.options = options || ({} as V);
		this.context = (this.constructor as typeof OGLXRLayer).context;

		if (!this.context) {
			throw new Error('Layer not registered in XRRenderer or called before init');
		}

		this.onLayerDestroy = () => undefined;
		this.id = ID++;
		this.label = `layer_${this.id}_${this.type}`;
	}

	public get needsUpdateNative() {
		return (
			OGLXRLayer.ALLOW_NATIVE &&
			this.useNative &&
			(!this.nativeLayer || this.layerNeedReconstruct) &&
			this.isValid
		);
	}

	public get isValid() {
		return false;
	}

	/**
	 * External texture onUpdate event, fired when texture load to GPU
	 */
	protected onTextureUpdate() {
		this.contentDirty = true;
	}

	private _attachTexture(texture: Texture<any>) {
		if (texture === this._texture) {
			return;
		}

		const old = this._texture;

		if (old) {
			old.onUpdate = old._onUpdateCached;
			old._onUpdateCached = null;
		}

		if (texture) {
			texture._onUpdateCached = texture.onUpdate;

			texture.onUpdate = () => {
				texture._onUpdateCached?.();
				this.onTextureUpdate();
			};
		}

		this._needsCallReconstruct = true;
		this._texture = texture;
	}

	protected initDone() {
		this.id = this.context.registerLayer(this);

		this.createClipMesh();
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	protected _removeClipMesh(layers: ILayerPrimitive): void {}

	protected _createClipMesh(): ILayerPrimitive {
		throw new Error('Not implemented');
	}

	public getRenderTarget(frame: WEBXR.XRFrame, eye: 'left' | 'right' | 'none' = 'none'): XRRenderTarget {
		const target = this.targets[eye] || new XRRenderTarget(this.context);

		target.referencedTexture = this._texture;
		target.attach(this.context.xr.glBinding.getSubImage(this.nativeLayer as WEBXR.XRCompositionLayer, frame, eye));

		this.targets[eye] = target;

		return target;
	}

	// bind layer, if layer is null - native will be unbound and dropped
	/* internal */ bindLayer(layer: T | null) {
		if (layer === this.nativeLayer && (!this.layerNeedReconstruct || !layer)) {
			return;
		}

		if (this.nativeLayer) {
			this.onLayerDestroy?.(this, true);
			this._destroyNative();
		}

		this.nativeLayer = layer;

		if (layer) {
			this._updateNative(null);
		}

		this.createClipMesh();

		// if layer is presented, use clip mesh only as depth clipper
		// eslint-disable-next-line no-nested-ternary
		this.clipMesh.maskMode = layer
			? OGLXRLayer.ALLOW_ALPHA_CLIP && this.clipMode === 'alpha'
				? 'alpha'
				: 'depth'
			: 'none';

		// always must be visible for intersection
		this.clipMesh.visible = true; // !layer || (this.useDepthClip && OGLXRLayer.ALLOW_DEPTH_CLIP);

		this.layerNeedReconstruct = false;

		// force update layer after binding
		this.contentDirty = true;
		this._needsCallReconstruct = true;
	}

	protected _updateClipMesh(frame: WEBXR.XRFrame) {
		// no update when not exis
		if (this.nativeLayer) {
			return;
		}

		if (this.dimensionsDirty) {
			this.clipMesh.apply(this.options);
		}

		this.clipMesh.texture = this._texture;
	}

	protected _updateNative(frame: WEBXR.XRFrame = null) {
		// we can pool it, XRRig not allow pooling
		// need has a invalidate stat, but this is not implemented
		if (this.transformDirty || !this.nativeTransform) {
			this.updateMatrixWorld(true);

			this.worldMatrix.getRotation(tmpQuat);
			this.worldMatrix.getTranslation(tmpPos);

			this.nativeTransform = new self.XRRigidTransform(tmpPos, tmpQuat);
		}

		if (this.dimensionsDirty) {
			for (const key in this.nativeLayer) {
				if (key in this.options) {
					this.nativeLayer[key] = (this.options as any)[key];
				}
			}

			this._needsCallReconstruct = true;
		}

		this.nativeLayer.transform = this.nativeTransform;

		if (this.label === 'right') {
			const p = this.nativeTransform.position;
			console.debug('right pos:', [p.x, p.y, p.z].map((e) => e.toFixed(3)).join(','));
		}
	}

	public update(frame: WEBXR.XRFrame) {
		// skip update
		if (!(this.willRender && this.visible)) {
			return;
		}

		this.clipMesh && this._updateClipMesh(frame);

		this.nativeLayer && this._updateNative(frame);
		// should be applied in top
		this.dimensionsDirty = false;

		if (this._needsCallReconstruct) {
			this.onLayerConstruct?.();
		}

		this._needsCallReconstruct = false;
	}

	public needUpdateTransform() {
		this.transformDirty = true;
	}

	protected _destroyNative() {
		this.nativeLayer = null;
		this.nativeTransform = null;
		this._needsCallReconstruct = true;
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
		console.log('destroy native layer instance');
		this.onLayerDestroy?.(this, false);
		this._destroyNative();

		for (const key in this.targets) {
			this.targets[key].destroy();
		}

		this.targets = null;
		this._texture = null;
	}

	public dispose() {
		this.destroy();
	}
}

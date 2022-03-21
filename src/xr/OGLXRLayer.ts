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
	public id: number = 0;

	context: XRRenderer;
	options: V;
	nativeLayer: T;
	nativeTransform: XRRigidTransform;
	emulatedLayers: ILayerPrimitive[]; //
	targets: Record<string, XRRenderTarget> = {};
	referencedTexture: Texture<IImageSource> = null;
	dirty: boolean = false;

	onLayerDestroy: (layer: this, nativeOnly: boolean) => void;

	readonly type: "cube" | "quad" | "none" = "none";

	transformDirty: boolean = true;

	constructor(options: V) {
		super();

		this.options = options;
		this.context = (this.constructor as typeof OGLXRLayer).context;

		if (!this.context) {
			throw new Error('Layer not registered in XRRendere or called before init');
		}

		this.onLayerDestroy = () => {};

		this.id = this.context.registerLayer(this);
	}

	get isNative() {
		return !!this.nativeLayer && !this.emulatedLayers;
	}

	protected _removeFallbackLayers(layers: Array<ILayerPrimitive>): void {}

	protected _createFallbackLayers(): Array<ILayerPrimitive> {
		throw new Error("Not implemented");
	}

	getRenderTarget(
		frame: XRFrame,
		eye: "left" | "right" | "none" = "none"
	): XRRenderTarget {
		const target = this.targets[eye] || new XRRenderTarget(this.context);

		target.referencedTexture = this.referencedTexture;
		target.attach(
			this.context.xr.glBinding.getSubImage(
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
			this.destroyFallback();

			this.nativeLayer = layer;
			this._updateNative(null);
		} else {
			// add virtual layer
			this.createFallback();
		}
	}

	protected _updateFallback(frame: XRFrame) {
		this.emulatedLayers.forEach((e) => {
			e.texture = this.referencedTexture;
		});
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
		this.emulatedLayers && this._updateFallback(frame);
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

	createFallback() {
		if (this.emulatedLayers) {
			return;
		}

		this.emulatedLayers = this._createFallbackLayers();
		this.emulatedLayers &&
			this.emulatedLayers.forEach((e, i) => {
				e.texture = this.referencedTexture;
				e.eye =  this.emulatedLayers.length === 1 ? 'none' : ['left', 'right'][i] as any;
				this.addChild(e)
			});
	}

	destroyFallback() {
		if (!this.emulatedLayers) {
			return;
		}

		this._removeFallbackLayers(this.emulatedLayers);

		this.emulatedLayers.forEach((e) => this.removeChild(e));
		this.emulatedLayers = null;
	}

	destroy() {
		this.onLayerDestroy?.(this, false);
		this.destroyNative();

		for(let key in this.targets) {
			this.targets[key].destroy();
		}

		this.targets = null;
		this.referencedTexture = null;
	}
}

export class OGLQuadLayer extends OGLXRLayer<XRQuadLayer, IQuadLayerInit> {
	readonly type: "cube" | "quad" | "none" = "quad";

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

	// called before fallback layer is removed
	protected _removeFallbackLayers(layer: Array<ILayerPrimitive>): void {}

	protected _createFallbackLayers(): Array<ILayerPrimitive> {
		const fallback = [new QuadPrimitive(this.context.gl, this.options)];

		if (this.options.layout?.includes("stereo")) {
			fallback.push(new QuadPrimitive(this.context.gl, this.options));
		}

		return fallback;
	}

	_updateNative(frame: XRFrame = null): void {
		super._updateNative(frame);

		this.nativeLayer.transform = this.nativeTransform;

		if ((this.nativeLayer.needsRedraw || this.dirty) && frame && this.referencedTexture) {

			if (!this.options.layout?.includes('stereo')) {
				this.getRenderTarget(frame, 'none').copyFrom(this.referencedTexture);;
			} else {
				for(let key of ['left', 'right'] as const) {
					this.getRenderTarget(frame, key).copyFrom(this.referencedTexture);
				}
			}

			this.dirty = false;
		}
	}
}

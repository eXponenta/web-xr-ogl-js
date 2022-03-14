import { Mesh, Texture, Transform, IImageSource, Quat, Vec3 } from "ogl";
import type {
	IQuadLayerInit,
	XRCompositionLayer,
	XRFrame,
	XRQuadLayer,
	XRRigidTransform,
	XRView,
} from "webxr";
import { QuadPrimitive } from "../primitives/QuadPrimitive";
import type { XRRenderer } from "./XRRenderer";
import { XRRenderTarget } from "./XRRenderTarget";

export class OGLXRLayer<
	T extends XRCompositionLayer = XRCompositionLayer,
	V = any
> extends Transform {
	context: XRRenderer;
	options: V;
	nativeLayer: T;
	nativeTransform: XRRigidTransform;
	emulatedLayers: Mesh[]; //
	targets: Record<string, XRRenderTarget> = {};
	referencedTexture: Texture<IImageSource> = null;
	dirty: boolean = false;

	onLayerDestroy: (layer: this, nativeOnly: boolean) => void;

	readonly type: "cube" | "quad" | "none" = "none";

	transformDirty: boolean = true;

	constructor(context: XRRenderer, options: V) {
		super();

		this.options = options;
		this.context = context;

		this.onLayerDestroy = () => {};
	}

	get isNative() {
		return !!this.nativeLayer && !this.emulatedLayers;
	}

	protected _removeFallbackLayers(layers: Array<Mesh>): void {}

	protected _createFallbackLayers(): Array<Mesh> {
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
			// add virtual laye
			this.createFallback();
		}
	}

	protected _updateNative(frame: XRFrame = null) {
		// we can pool it, XRRig not allow pooling
		// need has a invalidate stat, but this is not implemented

		if (this.transformDirty || !this.nativeTransform) {
			const q = new Quat();
			const p = new Vec3();

			this.updateMatrixWorld(false);

			this.worldMatrix.getRotation(q);
			this.worldMatrix.getTranslation(p);

			this.nativeTransform = new self.XRRigidTransform(p,q);
		}
	}

	update(frame: XRFrame) {
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
			this.emulatedLayers.forEach((e) => this.addChild(e));
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
	protected _removeFallbackLayers(layer: Array<Mesh>): void {}

	protected _createFallbackLayers(): Array<Mesh> {
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
				this.getRenderTarget(frame, 'none');
			} else {
				for(let key of ['left', 'right'] as const) {
					this.getRenderTarget(frame, key);//.copyFrom(this.referencedTexture);
				}
			}

			this.dirty = false;
		}
	}
}

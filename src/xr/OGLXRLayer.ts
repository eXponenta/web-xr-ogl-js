import { Mesh, Transform } from "ogl";
import type {
	IQuadLayerInit,
	XRCompositionLayer,
	XRQuadLayer,
	XRRigidTransform,
} from "webxr";
import { QuadPrimitive } from "../primitives/QuadPrimitive";
import type { XRRenderer } from "./XRRenderer";

export class OGLXRLayer<
	T extends XRCompositionLayer = XRCompositionLayer,
	V = any
> extends Transform {
	context: XRRenderer;
	options: V;
	nativeLayer: T;
	nativeTransform: XRRigidTransform;
	emulatedLayers: Mesh[]; //

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

	// bind layer, if layer is null - native will be unbound and dropeed
	bindLayer(layer: T | null) {
		if (this.nativeLayer && this.nativeLayer !== layer) {
			this.onLayerDestroy?.(this, true);
			this.destroyNative();
		}

		if (layer) {
			this.destroyFallback();

			this.nativeLayer = layer;
			this._updateNative();
		} else {
			// add virtual laye
			this.createFallback();
		}
	}

	protected _updateNative() {
		// we can pool it, XRRig not allow pooling
		// need has a invalidate stat, but this is not implemented

		if (this.transformDirty || !this.nativeTransform) {
			this.nativeTransform = new self.XRRigidTransform(
				this.position,
				this.quaternion
			);
		}
	}

	update() {
		this.nativeLayer && this._updateNative();
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

	_updateNative(): void {
		super._updateNative();

		this.nativeLayer.transform = this.nativeTransform;
	}
}

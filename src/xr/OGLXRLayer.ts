import { Mesh, Transform } from "ogl";
import type { IQuadLayerInit, XRCompositionLayer, XRQuadLayer, XRRigidTransform } from "webxr";
import type { XRRenderer } from "./XRRenderer";

export class OGLXRLayer <T extends XRCompositionLayer = XRCompositionLayer, V = any> extends Transform {
	context        : XRRenderer;
	options        : V;
	nativeLayer    : T;
	nativeTransform: XRRigidTransform;
	emulatedLayer  : Mesh[]; //

	readonly type: 'cube' | 'quad' | 'none' = 'none';

	transformDirty: boolean = true;

	constructor (context: XRRenderer, options: V) {
		super ()

		this.options = options;
		this.context = context;
	}

	get isNative() {
		return !!this.nativeLayer && !this.emulatedLayer;
	}

	protected _createFallbackLayer() {
		throw new Error('Not implemented');
	}

	// bind layer, if layer is null - native will be unbound and dropeed
	bindLayer (layer: T | null) {
		if (this.nativeLayer && this.nativeLayer !== layer) {
			this.destroy();
		}

		if (layer) {
			this.nativeLayer = layer;
			this._updateNative();
		} else {
			this._createFallbackLayer();
		}
	}

	protected _updateNative() {
		// we can pool it, XRRig not allow pooling
		// need has a invalidate stat, but this is not implemented

		if (this.transformDirty || !this.nativeTransform) {
			this.nativeTransform = new self.XRRigidTransform(this.position, this.quaternion);
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
			this.context.xr && this.context.xr.onLayerRemove(this.nativeLayer);
		}

		this.nativeLayer = null;
		this.nativeTransform = null;
	}

	destroy () {
		this.destroyNative();
	}
}

export class OGLQuadLayer extends OGLXRLayer <XRQuadLayer, IQuadLayerInit> {
	readonly type: "cube" | "quad" | "none" = 'quad';

	set width (v: number) {
		this.nativeLayer.width = v;
	}

	get width () {
		return this.nativeLayer.width;
	}

	set height (v: number) {
		this.nativeLayer.height = v;
	}

	get height () {
		return this.nativeLayer.height;
	}

	protected _createFallbackLayers(): void {
		if (this.emulatedLayer) {
			return;
		}
	}

	_updateNative(): void {
		super._updateNative();

		this.nativeLayer.transform = this.nativeTransform;
	}
}

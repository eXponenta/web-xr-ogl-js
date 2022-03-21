import * as WEBXR from "webxr";

import XRLayers from "webxr-layers-polyfill";

import { XRSessionLayers } from ".";
import { XRRenderTarget } from "./XRRenderTarget";
import type { XRInputTransform } from "./XRInputTransform";
import type { XRRenderer } from "./XRRenderer";

export interface ISessionRequest {
	mode?: WEBXR.XRSessionMode;
	space?: WEBXR.XRReferenceSpaceType;
	options?: WEBXR.XRSessionInit;
}

export interface XRStateEventMap {
	xrend: CustomEvent<never>;
	xrstart: CustomEvent<XRState>;
	xrinputsourceschange: CustomEvent<WEBXR.XRInputSourceArray>;
}

/* Polyfill when needed */
new XRLayers();

export function getXR() {
	return navigator.xr;
}

export class XRState extends EventTarget {
	static layersSupport = false;

	context: XRRenderer;
	session: XRSessionLayers;
	space: WEBXR.XRReferenceSpace;
	layers: Array<WEBXR.XRCompositionLayer | WEBXR.XRWebGLLayer> = [];
	baseLayer: WEBXR.XRWebGLLayer | WEBXR.XRCompositionLayer = null;
	baseLayerTarget: XRRenderTarget;
	lastXRFrame: WEBXR.XRFrame = null;
	glBinding: WEBXR.XRWebGLBinding;

	constructor(context: XRRenderer) {
		super();

		this.context = context;

		this.onEnd = this.onEnd.bind(this);
		this.onInputChanged = this.onInputChanged.bind(this);
	}

	async requestSession({
		mode = "immersive-vr",
		space = "local",
		options = {
			requiredFeatures: ["local"],
			optionalFeatures: ["layers"],
		},
	}: ISessionRequest = {}) {
		if (this.session) {
			this.end();
		}

		const session: XRSessionLayers = await getXR().requestSession(
			mode,
			options
		);

		XRState.layersSupport = !!session.renderState.layers;

		const refSpace = await session.requestReferenceSpace(space);

		this.init(session, refSpace);

		return this;
	}

	private init(session: XRSessionLayers, space: WEBXR.XRReferenceSpace) {
		if (this.session) {
			this.clear();
		}

		this.space = space;
		this.session = session;
		this.session.addEventListener("end", this.onEnd.bind(this));
		this.session.addEventListener(
			"inputsourceschange",
			this.onInputChanged.bind(this)
		);

		this.dispatchEvent(
			new CustomEvent("xrstart", {
				detail: this,
			})
		);
	}

	public get active() {
		return !!this.session;
	}

	public addEventListener<T extends keyof XRStateEventMap>(
		type: T,
		listener: (this: XRState, ev: XRStateEventMap[T]) => any,
		options?: boolean | AddEventListenerOptions
	): void;
	public addEventListener(
		type: string,
		listener: (this: XRState, ev: Event) => any,
		options?: boolean | AddEventListenerOptions
	): void {
		super.addEventListener(type, listener, options);
	}

	public removeEventListener<T extends keyof XRStateEventMap>(
		type: T,
		listener: (this: XRState, ev: XRStateEventMap[T]) => any
	): void;
	public removeEventListener(
		type: string,
		listener: (this: XRState, ev: Event) => any,
		options?: boolean | AddEventListenerOptions
	): void {
		super.addEventListener(type, listener, options);
	}

	private onInputChanged(event: WEBXR.XRInputSourceEvent) {
		this.dispatchEvent(
			new CustomEvent("xrinputsourceschange", {
				detail: this.session?.inputSources || [],
			})
		);
	}

	private onEnd() {
		this.clear();

		this.onInputChanged(null);
		this.dispatchEvent(new CustomEvent("xrend"));
	}

	public get inputSources(): Array<
		WEBXR.XRInputSource & { viewTransfromNode: XRInputTransform }
	> {
		return (this.session?.inputSources as any) || [];
	}

	// called from layer binding for dropping layer from state
	/* internal*/ onLayerDestroy(layer: WEBXR.XRCompositionLayer | WEBXR.XRWebGLLayer) {
		if (!XRState.layersSupport || !this.session) {
			return;
		}

		(layer as WEBXR.XRCompositionLayer)?.destroy();

		this.layers = this.layers.filter((l) => l !== layer);

		this.updateRenderState();
	}

	protected updateRenderState() {
		if (XRState.layersSupport) {
			this.session.updateRenderState({ layers: this.layers });
		} else {
			this.session.updateRenderState({
				baseLayer: this.baseLayer as WEBXR.XRWebGLLayer,
			});
		}
	}

	/* internal */ getLayer(
		type: "base" | "cube" | "quad" | "sphere" = "base",
		options: WEBXR.IXRCompositionLayerInit & Record<string, any> = {
			space: this.space,
			viewPixelHeight: 100,
			viewPixelWidth: 100,
		}
	): WEBXR.XRCompositionLayer | WEBXR.XRWebGLLayer {
		options = Object.assign(
			{},
			{ space: this.space, viewPixelHeight: 100, viewPixelWidth: 100 },
			options
		);

		if (
			!XRState.layersSupport &&
			(type !== "base" || this.layers.length > 1)
		) {
			console.warn("[XR] Only single base layer is supported!");
			return null;
		}

		let layer: WEBXR.XRCompositionLayer | WEBXR.XRWebGLLayer;

		if (!XRState.layersSupport) {
			layer = new self.XRWebGLLayer(this.session, this.context.gl);
			this.baseLayer = layer;
		} else if (!options) {
			throw new Error("Only base layer can miss options!");
		} else {
			this.glBinding =
				this.glBinding || new self.XRWebGLBinding(this.session, this.context.gl);

			switch (type) {
				case "base": {
					layer = this.glBinding.createProjectionLayer({});
					this.baseLayer = layer;
					this.baseLayerTarget = new XRRenderTarget(this.context);
					this.baseLayerTarget.ignoreDepthValue =
						layer.ignoreDepthValues;

					console.debug("Occure presentation layer", this.baseLayer);

					break;
				}
				case "quad": {
					layer = this.glBinding.createQuadLayer(
						options as WEBXR.IQuadLayerInit
					);
					break;
				}
				default:
					throw new Error("Unsuppoted yet:" + type);
			}
		}

		// push front
		this.layers.unshift(layer);

		this.updateRenderState();

		return layer;
	}

	/* internal */ requestAnimationFrame(callback) {
		if (!this.session) {
			throw new Error("Try to requiest anima frame on disabled XRState");
		}

		const loopid = this.session.requestAnimationFrame((time, frame) => {
			this.lastXRFrame = frame;

			callback(time, frame);

			this.lastXRFrame = null;
		});

		return () => {
			this.session?.cancelAnimationFrame(loopid);
		};
	}

	public end() {
		if (!this.session) {
			return;
		}

		const session = this.session;

		this.clear();

		this.onInputChanged(null);

		session.end();
	}

	public clear() {
		if (!this.session) {
			return;
		}

		this.session.removeEventListener("end", this.onEnd);
		this.session.removeEventListener(
			"inputsourceschange",
			this.onInputChanged
		);

		for (const layer of this.layers as WEBXR.XRCompositionLayer[]) {
			layer.destroy && layer.destroy();
		}

		this.layers = [];
		this.session = null;
		this.space = null;

		this.baseLayerTarget?.destroy();
		(this.baseLayer as WEBXR.XRCompositionLayer)?.destroy?.();

		this.baseLayerTarget = null;
		this.baseLayer = null;
		this.glBinding = null;
	}
}

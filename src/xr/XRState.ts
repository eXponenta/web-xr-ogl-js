/* eslint-disable no-restricted-globals */
import type * as WEBXR from 'webxr';

import XRLayers from 'webxr-layers-polyfill';

import type { XRSessionLayers } from '.';
import { XRRenderTarget } from './XRRenderTarget';
import type { XRInputTransform } from './XRInputTransform';
import type { XRRenderer } from './XRRenderer';

export interface ISessionRequest {
	mode?: WEBXR.XRSessionMode;
	space?: WEBXR.XRReferenceSpaceType;
	options?: WEBXR.XRSessionInit;
}

export interface XRStateEventMap {
	xrend: CustomEvent<never>;
	// eslint-disable-next-line no-use-before-define
	xrstart: CustomEvent<XRState>;
	xrinputsourceschange: CustomEvent<WEBXR.XRInputSourceArray>;
	xrvisibilitychange: CustomEvent<WEBXR.XRVisibilityState>;
}

export function getXR() {
	return navigator.xr;
}

/* Polyfill when needed */
getXR() && new XRLayers();

export class XRState extends EventTarget {
	static layersSupport = false;

	/**
	 * All allocated layers
	 */
	private allocatedLayers: Array<WEBXR.XRCompositionLayer> = [];

	/**
	 * Active presented layers
	 */
	public readonly activeLayers: Array<WEBXR.XRCompositionLayer> = [];

	/**
	 * Active layer without Projection
	 */
	public get activeCompositeLayerCount() {
		return this.activeLayers.length;
	}

	context: XRRenderer;

	session: XRSessionLayers;

	space: WEBXR.XRReferenceSpace;

	baseLayer: WEBXR.XRWebGLLayer | WEBXR.XRCompositionLayer = null;

	baseLayerTarget: XRRenderTarget;

	lastXRFrame: WEBXR.XRFrame = null;

	glBinding: WEBXR.XRWebGLBinding;

	scaleFactor = 1;

	constructor(context: XRRenderer) {
		super();

		this.context = context;

		this.onEnd = this.onEnd.bind(this);
		this.onInputChanged = this.onInputChanged.bind(this);
		this.onVisibleChanged = this.onVisibleChanged.bind(this);
	}

	async requestSession({
		mode = 'immersive-vr',
		space = 'local',
		options = {
			requiredFeatures: ['local'],
			optionalFeatures: ['layers'],
		},
	}: ISessionRequest = {}) {
		if (this.session) {
			this.end();
		}

		const session: XRSessionLayers = await getXR().requestSession(mode, options);

		XRState.layersSupport = !!session.renderState.layers;

		const refSpace = await session.requestReferenceSpace(space);

		this.init(session, refSpace);

		return this;
	}

	private init(session: XRSessionLayers, space: WEBXR.XRReferenceSpace) {
		if (this.session) {
			this.clear();
		}

		this.scaleFactor = window.XRWebGLLayer.getNativeFramebufferScaleFactor(session as any);
		this.space = space;
		this.session = session;
		this.session.addEventListener('end', this.onEnd);
		this.session.addEventListener('inputsourceschange', this.onInputChanged);
		this.session.addEventListener('visibilitychange', this.onVisibleChanged);

		this.dispatchEvent(
			new CustomEvent('xrstart', {
				detail: this,
			}),
		);
	}

	public get active() {
		return !!this.session;
	}

	public addEventListener<T extends keyof XRStateEventMap>(
		type: T,
		listener: (this: XRState, ev: XRStateEventMap[T]) => any,
		options?: boolean | AddEventListenerOptions,
	): void;

	public addEventListener(
		type: string,
		listener: (this: XRState, ev: Event) => any,
		options?: boolean | AddEventListenerOptions,
	): void {
		super.addEventListener(type, listener, options);
	}

	public removeEventListener<T extends keyof XRStateEventMap>(
		type: T,
		listener: (this: XRState, ev: XRStateEventMap[T]) => any,
	): void;

	public removeEventListener(
		type: string,
		listener: (this: XRState, ev: Event) => any,
		options?: boolean | AddEventListenerOptions,
	): void {
		super.addEventListener(type, listener, options);
	}

	private onInputChanged() {
		this.dispatchEvent(
			new CustomEvent('xrinputsourceschange', {
				detail: this.session?.inputSources || [],
			}),
		);
	}

	private onVisibleChanged() {
		this.dispatchEvent(new CustomEvent('xrvisibilitychange', { detail: this.session.visibilityState }));
	}

	private onEnd() {
		this.clear();

		this.onInputChanged();
		this.dispatchEvent(new CustomEvent('xrend'));
	}

	public get inputSources(): Array<WEBXR.XRInputSource & { viewTransformNode: XRInputTransform }> {
		return (this.session?.inputSources as any) || [];
	}

	// called from layer binding for dropping layer from state
	/* internal */ onLayerDestroy(layer: WEBXR.XRCompositionLayer) {
		if (!XRState.layersSupport || !this.session) {
			return;
		}

		(layer as WEBXR.XRCompositionLayer)?.destroy();

		if (!layer) {
			return;
		}

		let index = this.allocatedLayers.indexOf(layer);

		index > -1 && this.allocatedLayers.splice(index, 1);

		index = this.activeLayers.indexOf(layer);

		index > -1 && this.activeLayers.splice(index, 1);

		this.updateRenderState();
	}

	/* internal */ setLayersOrder(layers: XRLayers[]): boolean {
		const count = Math.min(this.activeLayers.length, layers.length);

		let orderChanged = this.activeLayers.length !== layers.length;

		for (let i = 0; i < count && !orderChanged; i++) {
			if (!layers[i]) {
				throw new Error('Layer value is undef, invalid state!');
			}
			if (layers[i] !== this.activeLayers[i]) {
				orderChanged = true;
				break;
			}
		}

		if (!orderChanged) {
			return false;
		}

		this.activeLayers.length = 0;
		this.activeLayers.push(...layers);
		this.updateRenderState();

		return true;
	}

	protected updateRenderState() {
		if (XRState.layersSupport) {
			this.session.updateRenderState({ layers: [...this.activeLayers, this.baseLayer] });
		} else {
			this.session.updateRenderState({
				baseLayer: this.baseLayer as WEBXR.XRWebGLLayer,
			});
		}

		// eslint-disable-next-line no-console
		console.debug('Regenerate render state');
	}

	/* internal */ getLayer(
		type: 'base' | 'cube' | 'quad' | 'sphere' = 'base',
		options: WEBXR.IXRCompositionLayerInit & Record<string, any> = {
			space: this.space,
			viewPixelHeight: 100,
			viewPixelWidth: 100,
		},
	): WEBXR.XRCompositionLayer | WEBXR.XRWebGLLayer {
		options = { space: this.space, viewPixelHeight: 100, viewPixelWidth: 100, ...options };

		if (!XRState.layersSupport && (type !== 'base' || this.allocatedLayers.length > 1)) {
			// eslint-disable-next-line no-console
			console.warn('[XR] Only single base layer is supported!');
			return null;
		}

		let layer: WEBXR.XRCompositionLayer;

		if (!XRState.layersSupport) {
			this.baseLayer = new self.XRWebGLLayer(this.session, this.context.gl, {
				framebufferScaleFactor: this.scaleFactor,
			});
		} else if (!options) {
			throw new Error('Only base layer can miss options!');
		} else {
			this.glBinding = this.glBinding || new self.XRWebGLBinding(this.session, this.context.gl);
			switch (type) {
				case 'base': {
					this.baseLayer = this.glBinding.createProjectionLayer({ scaleFactor: this.scaleFactor });
					this.baseLayerTarget = new XRRenderTarget(this.context);
					this.baseLayerTarget.ignoreDepthValue = this.baseLayer.ignoreDepthValues;

					// eslint-disable-next-line no-console
					console.debug('Allocate presentation layer', this.baseLayer);

					break;
				}
				case 'quad': {
					layer = this.glBinding.createQuadLayer(options as WEBXR.IQuadLayerInit);
					break;
				}
				default:
					throw new Error(`Unsupported yet:${type}`);
			}
		}

		// push front
		if (layer) {
			this.allocatedLayers.unshift(layer);
			this.activeLayers.unshift(layer);
		}

		this.updateRenderState();

		return layer;
	}

	/* internal */ requestAnimationFrame(callback) {
		if (!this.session) {
			throw new Error('Try to request anim frame on disabled XRState');
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

		const { session } = this;

		this.clear();

		this.onInputChanged();

		session.end();
	}

	public clear() {
		if (!this.session) {
			return;
		}

		this.session.removeEventListener('end', this.onEnd);
		this.session.removeEventListener('inputsourceschange', this.onInputChanged);
		this.session.removeEventListener('visibilitychange', this.onVisibleChanged);

		for (const layer of this.activeLayers as WEBXR.XRCompositionLayer[]) {
			layer.destroy && layer.destroy();
		}

		this.allocatedLayers.length = 0;
		this.activeLayers.length = 0;
		this.session = null;
		this.space = null;

		this.baseLayerTarget?.destroy();
		(this.baseLayer as WEBXR.XRCompositionLayer)?.destroy?.();

		this.baseLayerTarget = null;
		this.baseLayer = null;
		this.glBinding = null;
	}
}

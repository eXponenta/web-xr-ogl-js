import type { XRWebGLLayer, XRSystem, XRRenderState, XRLayer, XRSession, XRWebGLLayerInit } from 'webxr';

declare class XRWebGLLayerExt extends XRWebGLLayer {
	constructor (sesssion: XRSessionLayers, context: WebGL2RenderingContext | WebGLRenderingContext, options?: XRWebGLLayerInit);
}

declare global {
	interface Window {
		XRWebGLLayer: typeof XRWebGLLayerExt;
	}

	interface WebGL2RenderingContext {
		makeXRCompatible(): Promise<void>;
	}

	interface WebGLRenderingContext {
		makeXRCompatible(): Promise<void>;
	}
}

declare global {
	interface Navigator {
		xr: XRSystem;
	}
}

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type XRRenderStateLayers = Optional<XRRenderState, 'depthFar' | 'depthNear'> & { layers?: Array<XRLayer | XRWebGLLayer> };

export type XRSessionLayers = Omit<XRSession, 'renderState'> & {
	readonly renderState: XRRenderStateLayers;
	updateRenderState(XRStateInit: XRRenderStateLayers): Promise<void>
};

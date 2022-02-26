import type {
	XRWebGLLayer,
	XRSystem,
	XRRenderState,
	XRLayer,
	XRSession,
	XRWebGLLayerInit,
	XRRigidTransform,
	XRWebGLBinding,
} from "webxr";

declare class XRWebGLLayerExt extends XRWebGLLayer {
	constructor(
		sesssion: XRSessionLayers,
		context: WebGL2RenderingContext | WebGLRenderingContext,
		options?: XRWebGLLayerInit
	);
}

declare module "webxr" {
	interface XRCompositionLayer extends XRLayer {
		destroy(): void;
		readonly needsRedraw: boolean;
	}

	interface XRCubeLayer extends XRCompositionLayer {
		space: XRSpace;
		orientation: DOMPointReadOnly;
	}

	interface XRQuadLayer extends XRCompositionLayer {
		space: XRSpace;
		transform: XRRigidTransform;
		height: number;
		width: number;
	}

	interface IQuadLayerInit {
		height?: number;
		width?: number;
		layout?: 'default' | 'mono' | 'stereo' | 'stereo-left-righ' | 'stereo-top-bottom';
		space: XRSpace;
		transform?: XRRigidTransform;
		viewPixelHeight: number;
		viewPixelWidth: number;
		colorFormat?: number;
	}

	interface XRWebGLSubImage {
		colorTexture: WebGLTexture;
		depthStencilTexture: WebGLTexture;
		imageIndex: number | null;
		textureWidth: number;
		textureHeight: number;
	}

	class XRWebGLBinding {
		constructor (session: XRSessionLayers, context: WebGL2RenderingContext | WebGLRenderingContext);

		createQuadLayer (init: IQuadLayerInit): XRCubeLayer;

		getSubImage (layer: XRQuadLayer, frame: XRFrame, eye?:  'none' | 'left' | 'right'): XRWebGLSubImage;
	}
}

declare global {
	interface Window {
		XRWebGLLayer: typeof XRWebGLLayerExt;
		XRRigidTransform: typeof XRRigidTransform;
		XRWebGLBinding: typeof XRWebGLBinding;
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

export type XRRenderStateLayers = Optional<
	XRRenderState,
	"depthFar" | "depthNear"
> & { layers?: Array<XRLayer | XRWebGLLayer> };

export type XRSessionLayers = Omit<XRSession, "renderState"> & {
	readonly renderState: XRRenderStateLayers;
	updateRenderState(XRStateInit: XRRenderStateLayers): Promise<void>;
};

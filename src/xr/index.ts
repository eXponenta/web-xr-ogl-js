import type {
	XRWebGLLayer,
	XRSystem,
	XRRenderState,
	XRLayer,
	XRSession,
	XRWebGLLayerInit,
	XRRigidTransform,
	XRWebGLBinding,
	XRProjectionLayer
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

	interface XRProjectionLayer extends XRCompositionLayer {

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

	interface IXRProjectionLayerInit {

	}
	interface IXRCompositionLayerInit {
		layout?: 'default' | 'mono' | 'stereo' | 'stereo-left-righ' | 'stereo-top-bottom';
		space?: XRSpace;
		viewPixelHeight: number;
		viewPixelWidth: number;
	}

	interface IQuadLayerInit extends IXRCompositionLayerInit {
		height?: number;
		width?: number;
		transform?: XRRigidTransform;
		colorFormat?: number;
	}

	interface XRWebGLSubImage {
		colorTexture: WebGLTexture;
		depthStencilTexture: WebGLTexture;
		imageIndex: number | null;
		textureWidth: number;
		textureHeight: number;
		viewport: {
			x: number, y: number, width: number, height: number
		}
	}

	class XRWebGLBinding {
		constructor (session: XRSessionLayers, context: WebGL2RenderingContext | WebGLRenderingContext);

		createQuadLayer (init: IQuadLayerInit): XRCubeLayer;
		createProjectionLayer (init?: IXRProjectionLayerInit): XRProjectionLayer;

		getSubImage (layer: XRCompositionLayer, frame: XRFrame, eye?:  'none' | 'left' | 'right'): XRWebGLSubImage;
		getViewSubImage (layer: XRProjectionLayer, frame: XRView): XRWebGLSubImage;
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

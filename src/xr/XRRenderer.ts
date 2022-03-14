import { Renderer } from "ogl";
import XRLayers from "webxr-layers-polyfill";

import type {
	IQuadLayerInit,
	XRCompositionLayer,
	XRFrame,
	XRLayer,
	XRReferenceSpace,
	XRReferenceSpaceType,
	XRSessionInit,
	XRSessionMode,
	XRWebGLBinding,
	XRWebGLLayer,
} from "webxr";
import { XRSessionLayers } from ".";
import { OGLQuadLayer, OGLXRLayer } from "./OGLXRLayer";
import { XRRenderTarget } from "./XRRenderTarget";

/* Polyfill when needed */
new XRLayers();

function getXR() {
	return navigator.xr;
}

export interface ISessionRequest {
	mode?: XRSessionMode;
	space?: XRReferenceSpaceType;
	options?: XRSessionInit;
}

export class XRState {
	static layersSupport = false;

	context: XRRenderer;
	session: XRSessionLayers;
	space: XRReferenceSpace;
	layers: Array<XRCompositionLayer | XRWebGLLayer> = [];
	baseLayer: XRWebGLLayer | XRCompositionLayer = null;
	baseLayerTarget: XRRenderTarget;
	lastXRFrame: XRFrame = null;
	glBinding: XRWebGLBinding;

	static async requestSession(
		context: XRRenderer,
		{
		mode = "immersive-vr",
		space = "local-floor",
		options = {
			requiredFeatures: ["local-floor"],
			optionalFeatures: ["layers"],
		},
	}: ISessionRequest = {}) {
		const state = new XRState();

		if (!state.session) {
			state.session = await getXR().requestSession(mode, options);
		}

		state.context = context;
		this.layersSupport = !!state.session.renderState.layers;

		state.space = await state.session.requestReferenceSpace(space);

		return state;
	}

	// called from layer binding for dropping layer from state

	/* internal*/
	onLayerDestroy(layer: XRCompositionLayer | XRWebGLLayer) {
		if (!XRState.layersSupport) {
			return;
		}

		this.layers = this.layers.filter((l) => l !== layer);
		this.updateRenderState();
	}

	updateRenderState() {
		if (XRState.layersSupport) {
			this.session.updateRenderState({ layers: this.layers });
		} else {
			this.session.updateRenderState({ baseLayer: this.baseLayer as XRWebGLLayer });
		}
	}

	getLayer(
		gl: GLContext,
		type: "base" | "cube" | "quad" | "sphere" = "base",
		options: any = {}
	): XRCompositionLayer | XRWebGLLayer {

		options = Object.assign({}, { space: this.space, viewPixelHeight: 100, viewPixelWidth: 100 }, options);

		if (
			!XRState.layersSupport &&
			(type !== "base" || this.layers.length > 1)
		) {
			console.warn("[XR] Only single base layer is supported!");
			return this.baseLayer;
		}

		// check that supported
		if (!this.glBinding && XRState.layersSupport) {
		}

		let layer: XRCompositionLayer | XRWebGLLayer;

		if (!XRState.layersSupport) {
			layer = new self.XRWebGLLayer(this.session, gl);
			this.baseLayer = layer;
		} else if (!options) {
			throw new Error("Only base layer can miss options!");
		} else {
			this.glBinding =
				this.glBinding || new self.XRWebGLBinding(this.session, gl);

			switch (type) {
				case "base": {
					layer = this.glBinding.createProjectionLayer({});
					this.baseLayer = layer;
					this.baseLayerTarget = new XRRenderTarget(this.context);
					break;
				}
				case "quad": {
					layer = this.glBinding.createQuadLayer(options as IQuadLayerInit);
					break;
				}
				default:
					throw new Error("Unsuppoted yet:" + type);
			}
		}

		// push front
		this.layers.push(layer);

		this.updateRenderState();

		return layer;
	}

	requestAnimatioFrame(callback) {
		return this.session.requestAnimationFrame((time, frame) => {
			this.lastXRFrame = frame;

			callback(time, frame);

			this.lastXRFrame = null;
		});
	}

	end() {
		this.session && this.session.end();
	}

	destroy() {
		for(const layer of this.layers as XRCompositionLayer[]) {
			layer.destroy && layer.destroy();
		}

		this.layers = null;
	}
}

export class XRRenderer extends Renderer {
	xr: XRState = null;
	layers: OGLXRLayer<XRCompositionLayer>[] = [];

	static layersCtors: Record<
		"cube" | "quad" | "sphere",
		new (context: XRRenderer, ...any: any[]) => OGLXRLayer
	> = {
		cube: null,
		sphere: null,
		quad: OGLQuadLayer,
	};

	constructor(options) {
		super(options);
	}

	createLayer<T extends XRCompositionLayer = XRCompositionLayer>(
		type: "cube" | "quad" | "sphere" = "quad",
		options: any = {}
	): OGLXRLayer<T> {
		if (!this.xr) {
			throw new Error("Layers can be requiested ONLY in XR mode");
		}

		const Ctor = XRRenderer.layersCtors[type];

		if (!Ctor) {
			return null;
		}

		const layer = new Ctor(this, options);

		this.layers.push(layer);

		let nativeLayer: XRCompositionLayer;

		if (XRState.layersSupport) {
			nativeLayer = this.xr.getLayer(this.gl, type, options) as XRCompositionLayer;
		}

		layer.bindLayer(nativeLayer);

		return layer as OGLXRLayer<T, any>;
	}

	/* called by layer internal */
	onLayerDestroy(layer: OGLXRLayer, nativeOnly: boolean) {
		if (!nativeOnly) {
			this.layers = this.layers.filter((e) => layer !== e);
		}

		if (this.xr && layer.nativeLayer) {
			this.xr.onLayerDestroy(layer.nativeLayer);
		}
	}

	onSessionLost() {
		this.xr.destroy();

		for (const layer of this.layers) {
			// clear refs
			layer.nativeLayer = null;
			layer.onLayerDestroy = null;
			layer.destroy();
		}

		this.xr = null;
		this.layers = [];

		console.warn("XR Session end");
	}

	async requestXR(options?) {
		if (this.xr) {
			return Promise.resolve();
		}

		await this.gl.makeXRCompatible();

		this.xr = await XRState.requestSession(this, options);

		// must be, because we should render
		this.xr.getLayer(this.gl, "base");

		this.xr.session.addEventListener('end', this.onSessionLost.bind(this));

		return this.xr;
	}

	requestAnimatioFrame(callback) {
		if (this.xr) {
			return this.xr.requestAnimatioFrame(callback);
		}

		return self.requestAnimationFrame(callback);
	}

	setViewportUnchecked({ width, height, x = 0, y = 0 }) {
		this.state.viewport.width = width;
		this.state.viewport.height = height;
		this.state.viewport.x = x;
		this.state.viewport.y = y;
		this.gl.viewport(x, y, width, height);
	}

	bind2DTextureDirect (texture: WebGLTexture) {
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.state.textureUnits[this.state.activeTextureUnit] = -1;
	}

	renderXR(options) {
		const { xr, gl } = this;

		if (!xr || !xr.lastXRFrame) {
			return;
		}

		const camera = options.camera;

		const { lastXRFrame, space, baseLayer, glBinding, baseLayerTarget } = xr;
		const poses = lastXRFrame.getViewerPose(space);

		if (!poses) {
			return;
		}

		poses.views.forEach((view, i) => {
			const { projectionMatrix, transform } = view;
			const { position, orientation } = transform;

			let target;
			let viewport;

			if (baseLayer instanceof self.XRWebGLLayer) {
				viewport = baseLayer.getViewport(view);

				target = {
					target: gl.FRAMEBUFFER,
					buffer: baseLayer.framebuffer,
					width: viewport.width,
					height: viewport.height,
				};
			} else {
				const glSubImage = glBinding.getViewSubImage( baseLayer as XRCompositionLayer, view );

				viewport = glSubImage.viewport;
				target = baseLayerTarget;

				if ( i === 0 ) {
					baseLayerTarget.attach(glSubImage, true);
				}
			}

			camera.projectionMatrix.copy(projectionMatrix);
			camera.position.set(position.x, position.y, position.z);
			camera.quaternion.set(
				orientation.x,
				orientation.y,
				orientation.z,
				orientation.w
			);

			camera.updateMatrixWorld();

			this.setViewportUnchecked(viewport);

			super.render({
				...options,
				camera,
				target,
				clear:
					i === 0 &&
					(options.clear != void 0 ? options.clear : this.autoClear),
			});
		});

		if (baseLayerTarget) {
			baseLayerTarget.blit();
		}

		// reset state, XRLyaer polyfill will corrupt state
		this.bindFramebuffer();

		this.layers.forEach((e) => {
			if (e === baseLayer as any) {
				return;
			}

			e.update(lastXRFrame);
		});

	}

	render(options) {
		// render to XR if not a target and XR mode
		if (!options.target && this.xr) {
			return this.renderXR(options);
		}

		super.render(options);
	}
}

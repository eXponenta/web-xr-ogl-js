import { Renderer } from "ogl";
import type {
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
import { OGLXRLayer } from "./OGLXRLayer";

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

	session: XRSessionLayers;
	space: XRReferenceSpace;
	layers: Array<XRLayer | XRWebGLLayer> = [];
	baseLayer: XRWebGLLayer = null;
	lastXRFrame: XRFrame = null;
	glBinding: XRWebGLBinding;

	static async requestSession({
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

		this.layersSupport === !!state.session.renderState.layers;

		state.space = await state.session.requestReferenceSpace(space);

		return state;
	}

	// called from layer binding for dropping layer from state

	/* internal*/
	onLayerRemove(layer: XRCompositionLayer | XRWebGLLayer) {
		if (!XRState.layersSupport) {
			return;
		}

		this.layers = this.layers.filter((l) => l !== layer);

		this.session.updateRenderState({ layers: this.layers });
	}

	getLayer(type = "base", gl): OGLXRLayer<XRCompositionLayer> | null {
		if (
			!XRState.layersSupport &&
			(type !== "base" || this.layers.length > 1)
		) {
			console.warn("[XR] Only single base layer is supported!");
			return null;
		}

		// check that supported
		if (!this.glBinding && XRState.layersSupport) {
			this.glBinding = new self.XRWebGLBinding(this.session, gl);
		}

		const layer = new self.XRWebGLLayer(this.session, gl);

		// push front
		this.layers.unshift(layer);

		if (type === "base") {
			this.baseLayer = layer;
		}

		if (XRState.layersSupport) {
			this.session.updateRenderState({ layers: this.layers });
		} else {
			this.session.updateRenderState({ baseLayer: this.baseLayer });

			return null;
		}

		return null;
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
}

export class XRRenderer extends Renderer {
	xr: XRState = null;

	constructor(options) {
		super(options);
	}

	onSessionLost() {
		this.xr = null;

		console.warn("XR Session end");
	}

	async requestXR(options?) {
		if (this.xr) {
			return Promise.resolve();
		}

		await this.gl.makeXRCompatible();

		this.xr = await XRState.requestSession(options);

		this.xr.getLayer("base", this.gl);

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

	renderXR(options) {
		const { xr, gl } = this;

		if (!xr || !xr.lastXRFrame) {
			return;
		}

		const camera = options.camera;

		const { lastXRFrame, space, baseLayer } = xr;
		const poses = lastXRFrame.getViewerPose(space);

		if (!poses) {
			return;
		}

		poses.views.forEach((view, i) => {
			const { projectionMatrix, transform } = view;
			const { position, orientation } = transform;
			const viewport = baseLayer.getViewport(view);

			const target = {
				target: gl.FRAMEBUFFER,
				buffer: baseLayer.framebuffer,
				width: viewport.width,
				height: viewport.height,
			};

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
	}

	render(options) {
		// render to XR if not a target and XR mode
		if (!options.target && this.xr) {
			return this.renderXR(options);
		}

		super.render(options);
	}
}

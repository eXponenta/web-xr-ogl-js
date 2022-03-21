import { IRenderTaskOptions, Renderer } from "ogl";
import { OGLQuadLayer, OGLXRLayer } from "./layers";
import { ISessionRequest, XRState } from "./XRState";

import type { XRCompositionLayer, XRFrame } from "webxr";


type TRafCallback = (time: number, frame?: XRFrame) => void;

interface OCULUS_multiview extends OVR_multiview2 {
	framebufferTextureMultisampleMultiviewOVR?: (
		target: GLenum,
		attachment: GLenum,
		texture: WebGLTexture | null,
		level: GLint,
		samples: GLsizei,
		baseViewIndex: GLint ,
		numViews: GLsizei) => void
}
export class XRRenderer extends Renderer {
	static layersCtors: Record<
		"cube" | "quad" | "sphere",
		new (...any: any[]) => OGLXRLayer
	> = {
		cube: null,
		sphere: null,
		quad: OGLQuadLayer,
	};

	readonly xr: XRState;
	readonly attrs: WebGLContextAttributes;

	layers: OGLXRLayer<XRCompositionLayer>[] = [];

	_rafCallbacks: Map<number, TRafCallback> = new Map();
	_calbackID: number = 0;
	_clearLoopDel: () => void = null;
	_multiview: OCULUS_multiview;
	_multiviewAA: boolean = false;

	constructor(options) {
		super(options);

		this.xr = new XRState(this);

		this._onLayerDestroy = this._onLayerDestroy.bind(this);
		this._internalLoop = this._internalLoop.bind(this);

		this.xr.addEventListener("xrend", this.onSessionLost.bind(this));
		this.xr.addEventListener("xrstart", this.onSessionStart.bind(this));

		this.attrs = this.gl.getContextAttributes();

		Object.values(XRRenderer.layersCtors).forEach((ctor: typeof OGLXRLayer) => {
			ctor && (ctor.context = this);
		});

		/*
		this._multiview = this.gl.getExtension('OCULUS_multiview');
		this._multiviewAA = !!this._multiview;
		this._multiview = this.gl.getExtension('OVR_multiview2');

		if (this._multiview) {
			console.debug('[MULTIVEW] ' + this.gl.getParameter(this._multiview.MAX_VIEWS_OVR));
		}
		*/
	}

	_internalLoop(time?: number, frame?: XRFrame) {
		const callbacks = [...this._rafCallbacks.values()];

		this._rafCallbacks.clear();

		callbacks.forEach((c) => c(time, frame));

		this._attachLoop();
	}

	_clearLoop() {
		this._clearLoopDel?.();
		this._clearLoopDel = null;
	}

	_attachLoop() {
		this._clearLoop();

		if (this.xr.active) {
			this._clearLoopDel = this.xr.requestAnimationFrame(
				this._internalLoop
			);
			return;
		}

		const id = window.requestAnimationFrame(this._internalLoop);

		this._clearLoopDel = () => {
			window.cancelAnimationFrame(id);
		};
	}

	/**
	 * @deprecated use layer constructor instead
	 * @param type
	 * @param options
	 * @returns
	 */
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

		const layer = new Ctor(options);

		return layer as OGLXRLayer<T, any>;
	}

	/**
	 * Try to bind virtyal layer to native layer when XR is enabled and layer supported
	 */
	/* internal*/ bindNativeLayerTo(layer: OGLXRLayer): boolean {
		const {
			type, options
		} = layer;

		let nativeLayer: XRCompositionLayer;

		if (XRState.layersSupport) {

			options.space = this.xr.space;

			try {
				nativeLayer = this.xr.getLayer(type as any, options) as XRCompositionLayer;
			} catch(e) {
				console.error('[LAYER Binding Error]', e);
			}
		}

		layer.bindLayer(nativeLayer);

		return !!nativeLayer;
	}

	registerLayer(layer: OGLXRLayer): number {
		if (this.layers.indexOf(layer) > -1) {
			this.layers.splice(this.layers.indexOf(layer), 1);
		}

		layer.onLayerDestroy = this._onLayerDestroy;

		return this.layers.unshift(layer);
	}

	/* called by layer internal */
	_onLayerDestroy(layer: OGLXRLayer, nativeOnly: boolean) {
		if (!nativeOnly) {
			this.layers = this.layers.filter((e) => layer !== e);
		}

		this.xr.onLayerDestroy(layer.nativeLayer);
	}

	onSessionLost() {
		this._clearLoop();

		for (const layer of this.layers) {
			// clear refs to native
			layer.bindLayer(null);
		}

		// rerun render loop
		this._attachLoop();

		console.warn("XR Session end");
	}

	onSessionStart() {
		this._attachLoop();

		// must be, because we should render
		this.xr.getLayer("base");

		this.layers.forEach((l) => this.bindNativeLayerTo(l));
	}

	async requestXR(options?: ISessionRequest) {
		if (this.xr.active) {
			return Promise.resolve();
		}

		await this.gl.makeXRCompatible();

		this._clearLoop();

		try {
			await this.xr.requestSession(options);
		} finally {
			this._attachLoop();
		}

		return this.xr;
	}

	requestAnimationFrame(callback: TRafCallback) {
		const id = this._calbackID++;

		this._rafCallbacks.set(id, callback);

		if (!this._clearLoopDel) {
			this._attachLoop();
		}

		return id;
	}

	cancelAnimationFrame(id: number) {
		this._rafCallbacks.delete(id);
	}

	setViewportUnchecked({ width, height, x = 0, y = 0 }) {
		this.state.viewport.width = width;
		this.state.viewport.height = height;
		this.state.viewport.x = x;
		this.state.viewport.y = y;
		this.gl.viewport(x, y, width, height);
	}

	bind2DTextureDirect(texture: WebGLTexture) {
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.state.textureUnits[this.state.activeTextureUnit] = -1;
	}

	prepareLayerState() {
		if (!this.xr.active) {
			return;
		}

		this.layers.forEach((layer) => {
			if (!layer.nativeLayer) {
				this.bindNativeLayerTo(layer);
			}

			layer.update(this.xr.lastXRFrame);
		});
	}

	renderXR(options) {
		const { xr, gl } = this;

		if (!xr || !xr.lastXRFrame || !xr.active) {
			return;
		}

		this.prepareLayerState();

		const camera = options.camera;

		const {
			lastXRFrame,
			space,
			baseLayer,
			glBinding,
			baseLayerTarget
		} = xr;

		const poses = lastXRFrame.getViewerPose(space);

		if (!poses) {
			return;
		}

		xr.inputSources.forEach((source) => source.viewTransfromNode?.update(xr));

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
				const glSubImage = glBinding.getViewSubImage(
					baseLayer as XRCompositionLayer,
					view
				);

				viewport = glSubImage.viewport;
				target = baseLayerTarget;

				if (i === 0) {
					baseLayerTarget.attach(glSubImage, this.attrs.antialias);
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
	}

	render(options: IRenderTaskOptions) {
		// render to XR if not a target and XR mode
		if (!options.target && this.xr.active) {
			return this.renderXR(options);
		}


		// update regular layers
		this.layers.forEach((e) => e.update(null));

		super.render(options);
	}
}

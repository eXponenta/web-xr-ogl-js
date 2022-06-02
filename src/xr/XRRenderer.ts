/* eslint-disable no-bitwise */
/* eslint-disable no-restricted-globals */
import { IRenderTarget, IRenderTaskOptions, Mesh, Renderer, Vec3 } from 'ogl';
import type { XRCompositionLayer, XRFrame } from 'webxr';
import { OGLQuadLayer, OGLXRLayer } from './layers';
import { ISessionRequest, XRState } from './XRState';

const tempVec3 = new Vec3();
const ID = 1;

type TRafCallback = (time: number, frame?: XRFrame) => void;

interface OCULUS_multiview extends OVR_multiview2 {
	framebufferTextureMultisampleMultiviewOVR?: (
		target: GLenum,
		attachment: GLenum,
		texture: WebGLTexture | null,
		level: GLint,
		samples: GLsizei,
		baseViewIndex: GLint,
		numViews: GLsizei,
	) => void;
}
export class XRRenderer extends Renderer {
	static layersCtors: Record<'cube' | 'quad' | 'sphere', new (...any: any[]) => OGLXRLayer> = {
		cube: null,
		sphere: null,
		quad: OGLQuadLayer,
	};

	readonly xr: XRState;

	readonly attrs: WebGLContextAttributes;

	layers: OGLXRLayer<XRCompositionLayer>[] = [];

	_sortedLayers: OGLXRLayer<XRCompositionLayer>[] = [];

	_rafCallbacks: Map<number, TRafCallback> = new Map();

	_callbackID = 0;

	_clearLoopDel: () => void = null;

	_multiview: OCULUS_multiview;

	_multiviewAA = false;

	_activeLayerID = 0;

	frustumCull = false;

	constructor(options) {
		super(options);

		this.xr = new XRState(this);

		this._onLayerDestroy = this._onLayerDestroy.bind(this);
		this._internalLoop = this._internalLoop.bind(this);

		this.xr.addEventListener('xrend', this.onSessionLost.bind(this));
		this.xr.addEventListener('xrstart', this.onSessionStart.bind(this));

		this.attrs = this.gl.getContextAttributes();

		Object.values(XRRenderer.layersCtors).forEach((ctor: typeof OGLXRLayer) => {
			ctor && (ctor.context = this);
		});

		this.state.clearColor = [0, 0, 0, 0];

		/*
		this._multiview = this.gl.getExtension('OCULUS_multiview');
		this._multiviewAA = !!this._multiview;
		this._multiview = this.gl.getExtension('OVR_multiview2');

		if (this._multiview) {
			console.debug('[MULTIVEW] ' + this.gl.getParameter(this._multiview.MAX_VIEWS_OVR));
		}
		*/
	}

	setClearColor(r = 0, g = r, b = r, a = r) {
		const { clearColor } = this.state;

		clearColor[0] = Math.max(Math.min(1, r || 0));
		clearColor[1] = Math.max(Math.min(1, g || 0));
		clearColor[2] = Math.max(Math.min(1, b || 0));
		clearColor[3] = Math.max(Math.min(1, a || 0));
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
			this._clearLoopDel = this.xr.requestAnimationFrame(this._internalLoop);
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
		type: 'cube' | 'quad' | 'sphere' = 'quad',
		options: any = {},
	): OGLXRLayer<T> {
		if (!this.xr) {
			throw new Error('Layers can be requested ONLY in XR mode');
		}

		const Ctor = XRRenderer.layersCtors[type];

		if (!Ctor) {
			return null;
		}

		const layer = new Ctor(options);

		return layer as OGLXRLayer<T, any>;
	}

	/**
	 * Try to bind virtual layer to native layer when XR is enabled and layer supported
	 */
	/* internal */ bindNativeLayerTo(layer: OGLXRLayer): boolean {
		// eslint-disable-next-line prefer-const
		let { type, options, needsUpdateNative, useNative } = layer;

		if (!useNative) {
			layer.bindLayer(null);
			return false;
		}

		if (!needsUpdateNative) {
			return false;
		}

		let nativeLayer;

		if (XRState.layersSupport && !nativeLayer) {
			options.space = this.xr.space;

			try {
				nativeLayer = this.xr.getLayer(type as any, options) as XRCompositionLayer;
			} catch (e) {
				// eslint-disable-next-line no-console
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

		console.warn('XR Session end');
	}

	onSessionStart() {
		this._attachLoop();

		// must be, because we should render
		this.xr.getLayer('base');

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
		const id = this._callbackID++;

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

	bind2DTextureDirect(texture: WebGLTexture, slot = 0) {
		// force update slot
		this.state.activeTextureUnit = -1;
		this.activeTexture(slot);
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.state.textureUnits[this.state.activeTextureUnit] = -1;
	}

	rebuildLayersState(frame: XRFrame) {
		if (!this.xr.active) {
			return;
		}

		const sortedLayers: OGLXRLayer<XRCompositionLayer>[] = [];
		/**
		 * Dirty! This should be prepared in XRState
		 */

		// check that layers is visible and need reconstruct state
		// @todo need to deep traversing over layer rigid
		for (const layer of this.layers) {
			// allocate only visible layers
			if (layer.visible && layer.willRender) {
				this.bindNativeLayerTo(layer);

				// has layers and should be sorted
				if (layer.nativeLayer) {
					sortedLayers.push(layer);
				}
			}
		}

		// sort
		sortedLayers.sort(this.sortTransparent);

		// check that changes in order
		const isOrderChanged =
			sortedLayers.length !== this._sortedLayers.length ||
			sortedLayers.some((a, i) => this._sortedLayers[i] !== a);

		// reconcile state
		// all invisible layers MUST be killed or hidden
		isOrderChanged && this.xr.setLayersOrder(sortedLayers.map((l) => l.nativeLayer));

		this._sortedLayers = sortedLayers;

		// update only known layers
		for (const layer of sortedLayers) {
			layer.update(frame);
		}
	}

	/* internal */
	getRenderList({ scene, camera, frustumCull, sort }): Array<Mesh> {
		const layerID = this._activeLayerID;

		let renderList = [];

		if (camera && frustumCull) camera.updateFrustum();

		// Get visible
		scene.traverse((node) => {
			node.willRender = true;

			if (node.parent && !node.parent.willRender) {
				node.willRender = false;
				return;
			}

			if (!node.visible || (node.layerID != null && layerID !== node.layerID)) {
				node.willRender = false;
				return;
			}

			if (!node.draw) {
				return;
			}

			if (frustumCull && node.frustumCulled && camera) {
				if (!camera.frustumIntersectsMesh(node)) return;
			}

			renderList.push(node);
		});

		if (sort) {
			const opaque = [];
			const transparent = []; // depthTest true
			const ui = []; // depthTest false

			renderList.forEach((node) => {
				// Split into the 3 render groups
				if (!node.program.transparent) {
					opaque.push(node);
				} else if (node.program.depthTest) {
					transparent.push(node);
				} else {
					ui.push(node);
				}

				node.zDepth = 0;

				// Only calculate z-depth if renderOrder unset and depthTest is true
				if (node.renderOrder !== 0 || !node.program.depthTest || !camera) return;

				// update z-depth
				node.worldMatrix.getTranslation(tempVec3);
				tempVec3.applyMatrix4(camera.projectionViewMatrix);
				node.zDepth = tempVec3.z;
			});

			opaque.sort(this.sortOpaque);
			transparent.sort(this.sortTransparent);
			ui.sort(this.sortUI);

			renderList = opaque.concat(transparent, ui);
		}

		return renderList;
	}

	protected _renderRenderListXR(renderlist: Array<Mesh>, options: IRenderTaskOptions) {
		const { xr, gl } = this;

		if (!xr.lastXRFrame || !xr.active) {
			return;
		}

		const { camera } = options;

		const { lastXRFrame, space, baseLayer, glBinding, baseLayerTarget } = xr;

		const poses = lastXRFrame.getViewerPose(space);

		if (!poses) {
			return;
		}

		// move out
		// or ok?
		xr.inputSources.forEach((source) => source.viewTransformNode?.update(xr));

		poses.views.forEach((view, i) => {
			const { projectionMatrix, transform, eye } = view;
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
				const glSubImage = glBinding.getViewSubImage(baseLayer as XRCompositionLayer, view);

				viewport = glSubImage.viewport;
				target = baseLayerTarget;

				if (i === 0) {
					baseLayerTarget.attach(glSubImage, this.attrs.antialias);
				}
			}

			camera.projectionMatrix.copy(projectionMatrix);
			camera.position.set(position.x, position.y, position.z);
			camera.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);

			camera.updateMatrixWorld(true);

			this.bindFramebuffer(target);

			this.setViewportUnchecked(viewport);

			// clear only once
			if (i === 0 && (options.clear || (this.autoClear && options.clear !== false))) {
				this._clear(target);
			}

			renderlist.forEach((n) => {
				// set specific eye
				(n.program as any).eye = eye;
				n.draw({ camera });
			});
		});

		if (baseLayerTarget) {
			baseLayerTarget.blit();
		}

		this.resetLayerPolyfillState();

		this.rebuildLayersState(lastXRFrame);
	}

	// there some bugs in XR Layers polyfill
	private resetLayerPolyfillState() {
		// reset state, XRLayer polyfill will corrupt state
		this.currentGeometry = null;
		this.bindVertexArray(null);
		this.bindFramebuffer();

		// Reset current active texture
		// https://github.com/immersive-web/webxr-layers-polyfill/issues/25
		this.bind2DTextureDirect(null, 0);
	}

	public render({
		scene,
		camera,
		target = null,
		update = true,
		sort = true,
		/* frustumCull = this */
		clear,
	}: IRenderTaskOptions) {
		const renderXR = !target && this.xr.active;

		this.gl.clearColor(...this.state.clearColor);

		if (!renderXR) {
			// update regular layers
			// without bounding
			this.layers.forEach((e) => e.update(null));
		}

		if (target === null) {
			// make sure no render target bound so draws to canvas
			// for XR not make sense anyway
			this.bindFramebuffer();
			this.setViewport(this.width * this.dpr, this.height * this.dpr);
		} else {
			// bind supplied render target and update viewport
			this.bindFramebuffer(target);
			this.setViewport(target.width, target.height);
		}

		if (renderXR || clear || (this.autoClear && clear !== false)) {
			this._clear(target);
		}

		// updates all scene graph matrices
		if (update) scene.updateMatrixWorld();

		// Update camera separately, in case not in scene graph
		if (camera) camera.updateMatrixWorld();

		const renderList = this.getRenderList({ scene, frustumCull: this.frustumCull, sort, camera });

		// render list
		if (renderXR) {
			this._renderRenderListXR(renderList, { scene, camera });
		} else {
			renderList.forEach((n) => n.draw({ camera }));
		}

		// reset after loop, because can be bugged
		this.currentProgram = -1;
	}

	protected _clear(target: IRenderTarget = null) {
		// Ensure depth buffer writing is enabled so it can be cleared
		if (this.depth && (!target || target.depth)) {
			this.enable(this.gl.DEPTH_TEST);
			this.setDepthMask(true);
		}

		this.gl.clear(
			(this.color ? this.gl.COLOR_BUFFER_BIT : 0) |
				(this.depth ? this.gl.DEPTH_BUFFER_BIT : 0) |
				(this.stencil ? this.gl.STENCIL_BUFFER_BIT : 0),
		);
	}
}

import { Renderer } from 'ogl';
import type { XRFrame, XRLayer, XRReferenceSpace, XRReferenceSpaceType, XRSessionInit, XRSessionMode, XRWebGLLayer } from 'webxr';
import { XRSessionLayers } from './xr';

function getXR() {
	return navigator.xr;
}

export interface ISessionRequest {
	mode?: XRSessionMode;
	space?: XRReferenceSpaceType;
	options?: XRSessionInit;
}

export class XRState {
	static layersChecked = false;
	static layersSupport = false;

	session: XRSessionLayers;
	space: XRReferenceSpace;
	layers: Array<XRLayer | XRWebGLLayer> = [];
	baseLayer: XRWebGLLayer = null;
	lastXRFrame: XRFrame = null;

	static async requestSession({
		mode = 'immersive-vr',
		space = 'local-floor',
		options = {
			requiredFeatures: ['local-floor'],
			optionalFeatures: ['layers']
		}
	}: ISessionRequest = {})
	{
		const state = new XRState();

		if (!this.layersChecked) {
			try {
				state.session = await getXR().requestSession(mode, {
					requiredFeatures: [...options.requiredFeatures, 'layers'],
					optionalFeatures: [...options.optionalFeatures]
				});
				this.layersSupport = true;
			} catch (e) {
				this.layersSupport = false;
				console.log('Layers not supported');
			}

			this.layersChecked = true;
		}

		if (!state.session) {
			state.session = await getXR().requestSession(mode, options);
		}

		state.space = await state.session.requestReferenceSpace(space);

		return state;
	}

	/**
	 *
	 * @param {string} type
	 * @param {WebGLRenderingContext} gl
	 * @returns {import('webxr').XRLayer}
	 */
	getLayer (type = 'base', gl) {

		if (!XRState.layersSupport && (type !== 'base' || this.layers.length > 1)) {
			console.warn('[XR] Only single base layer is supported!');
			return this.baseLayer;
		}

		const layer = new self.XRWebGLLayer(this.session, gl);

		this.layers.push(layer);

		if (type === 'base') {
			this.baseLayer = layer;
		}

		if (XRState.layersSupport) {
			this.session.updateRenderState({layers: this.layers});
		} else {
			this.session.updateRenderState({baseLayer: this.baseLayer});
		}

		return layer;
	}

	requestAnimatioFrame ( callback ) {

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

	onSessionLost () {
		this.xr = null;

		console.warn('XR Session end');
	}

	async requestXR(options?) {
		if (this.xr) {
			return Promise.resolve()
		}

		await this.gl.makeXRCompatible();

		this.xr = await XRState.requestSession(options);

		this.xr.getLayer('base', this.gl);

		return this.xr;
	}

	requestAnimatioFrame ( callback ) {
		if (this.xr) {
			return this.xr.requestAnimatioFrame( callback )
		}

		return self.requestAnimationFrame( callback );
	}

	setViewportUnchecked({width, height, x = 0, y = 0}) {
		this.state.viewport.width = width;
        this.state.viewport.height = height;
        this.state.viewport.x = x;
        this.state.viewport.y = y;
        this.gl.viewport(x, y, width, height);
    }

	renderXR (options) {
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
				height: viewport.height
			};

			camera.projectionMatrix.copy(projectionMatrix);
			camera.position.set(position.x, position.y, position.z)
			camera.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);

			camera.updateMatrixWorld();

			this.setViewportUnchecked(viewport);

			super.render({
				...options, camera, target, clear: i === 0 && (options.clear != void 0 ? options.clear : this.autoClear)
			});
		});
	}

	render (options) {
		// render to XR if not a target and XR mode
		if (!options.target && this.xr) {
			return this.renderXR(options);
		}

		super.render(options)
	}
}

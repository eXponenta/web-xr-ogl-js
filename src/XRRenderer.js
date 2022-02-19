import { Renderer } from 'ogl';

/**
 * @returns {import('webxr').XRSystem}
 */
function getXR() {
	return navigator.xr;
}

export class XRState {
	constructor() {
		/**
		 * @type {import('webxr').XRSession}
		 */
		this.session = null;

		/**
		 * @type {import('webxr').XRReferenceSpace}
		 */
		this.space = null;

		/**
		 * @type {import('webxr').XRLayer[]}
		 */
		this.layers = [];

		/**
		 * @type {import('webxr').XRWebGLLayer}
		 */
		this.baseLayer = null;

		/**
		 * @type {import('webxr').XRFrame}
		 */
		this.lastXRFrame = null;
	}

	static async requestSession({
		mode = 'immersive-vr',
		space = 'local-floor',
		options = {
			requiredFeatures: ['local-floor'],
			optionalFeatures: ['layers']
		}
	} = {})
	{
		const state = new XRState();

		state.session = await getXR().requestSession(mode, options);

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
		const layer = new XRWebGLLayer(this.session, gl);

		this.layers.push(layer);

		if (type === 'base') {
			this.baseLayer = layer;
		}


		this.session.updateRenderState({layers: this.layers});

		return layer;
	}

	requestAnimatioFrame ( callback ) {

		return this.session.requestAnimationFrame((time, frame) => {
			this.lastXRFrame = frame;

			callback(time, frame);
		});
	}

	end() {
		this.session && this.session.end();
	}
}

export class XRRenderer extends Renderer {
	constructor(options) {
		super(options);

		/**
		 * @type {XRState}
		 */
		this.xr = null;
	}

	onSessionLost () {
		this.xr = null;

		console.warn('XR Session end');
	}

	async requestXR(options) {
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

		const { baseLayer, lastXRFrame, space } = xr;

		const poses = lastXRFrame.getViewerPose(space);

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
				...options, camera, target, clear: i === 0
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

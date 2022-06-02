import { GLTFLoader, GLTFAsset, Transform } from 'ogl';
import type { XRInputSource } from 'webxr';
import * as XRMotionControllerService from '@webxr-input-profiles/motion-controllers';
import { spawn } from './GLTFTree';
import { XRInputTransform } from './XRInputTransform';

const MODULE_URL = '@webxr-input-profiles/motion-controllers';
const BASE_PROFILE_URL = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0.10/dist/profiles';

const controllersCache: Record<
	string,
	{
		controller: XRMotionControllerService.MotionController;
		model?: Transform;
	}
> = {};

export class XRInputModel extends XRInputTransform {
	private _controller: XRMotionControllerService.MotionController;

	private _asset: GLTFAsset;

	private _status: 'pending' | 'ok' | 'error' | 'none' = 'none';

	public readonly context: GLContext;

	private _statusChange: (target: this) => void;

	private _modelNode: Transform = new Transform();

	// react-ogl has bug
	// see
	// eslint-disable-next-line no-use-before-define
	public set whenStatusChanged(v) {
		// eslint-disable-next-line no-debugger
		this._statusChange = v;
	}

	public get whenStatusChanged() {
		return this._statusChange;
	}

	constructor(gl: GLContext, { inputSource = null }: { inputSource?: XRInputSource } = {}) {
		super();

		this.context = gl;

		if (inputSource) this.source = inputSource;
	}

	public get status() {
		return this._status;
	}

	protected setStatus(status: 'ok' | 'error' | 'pending') {
		this._status = status;

		this.whenStatusChanged && this.whenStatusChanged(this);
	}

	protected async _loadController() {
		const key = this._source.profiles.concat([this._source.handedness]).join(',');

		this._controller = controllersCache[key]?.controller;
		this._modelNode = controllersCache[key]?.model;

		if (!this._controller) {
			const { profile, assetPath } = await XRMotionControllerService.fetchProfile(this._source, BASE_PROFILE_URL);

			this._controller = new XRMotionControllerService.MotionController(this._source, profile, assetPath);

			this._asset = await GLTFLoader.load(this.context, this._controller.assetUrl);

			this._modelNode = spawn(this.context, this._asset);

			controllersCache[key] = {
				controller: this._controller,
				model: this._modelNode,
			};

			console.log('Load model for:', key, controllersCache);
		} else {
			console.log('Restore model cache for:', key, controllersCache);
		}

		this.addChild(this._modelNode);
	}

	protected inputUpdated(from: XRInputSource, to: XRInputSource): void {
		super.inputUpdated(from, to);

		if (from !== to) {
			this.reset();
		}

		if (!this._source) {
			this.setStatus('ok');
			return;
		}

		setTimeout(() => {
			this.setStatus('pending');

			this._loadController()
				.then(() => {
					this.setStatus('ok');
				})
				.catch((e) => {
					this.setStatus('error');
					throw e;
				});
		});
	}

	protected reset() {
		//

		// dispose child too
		this._modelNode.setParent(null);
		this._modelNode = null;
		this._controller = null;
	}
}

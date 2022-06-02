import { Mat4, Transform } from 'ogl';
import type { XRInputSource } from 'webxr';
import { getCorrection } from './xrInputCorrection';
import type { XRState } from './XRState';

type PatchedTransform = Transform & {
	__transformPatched?: boolean;
	virtualParentMatrix?: Mat4;
};

function path_for_updateMatrixWorld(this: PatchedTransform, force: boolean) {
	if (this.matrixAutoUpdate) this.updateMatrix();
	if (this.worldMatrixNeedsUpdate || force) {
		if (this.virtualParentMatrix === null) this.worldMatrix.copy(this.matrix);
		else this.worldMatrix.multiply(this.virtualParentMatrix, this.matrix);
		this.worldMatrixNeedsUpdate = false;
		force = true;
	}

	for (let i = 0, l = this.children.length; i < l; i++) {
		this.children[i].updateMatrixWorld(force);
	}
}

const pathWorldTransform = (node: PatchedTransform) => {
	if (!node || node.__transformPatched) {
		return node;
	}

	node.__transformPatched = true;
	node.updateMatrixWorld = path_for_updateMatrixWorld.bind(node);
	node.virtualParentMatrix = new Mat4();

	return node;
};

const restoreWorldTransform = (node: PatchedTransform) => {
	if (!node || !node.__transformPatched) {
		return node;
	}

	delete node.__transformPatched;
	// delete override for instance, updateMatrixWorld will be reader from proto
	delete node.updateMatrixWorld;
	delete node.virtualParentMatrix;

	return node;
};

export class XRInputTransform extends Transform {
	// eslint-disable-next-line no-use-before-define
	protected _source: (XRInputSource & { viewTransformNode?: XRInputTransform }) | null;

	private _rayNodeOffset: Transform;

	private _rayNode: Transform;

	private _visible: boolean;

	private _valid: boolean;

	private _updateDeltaSpace: boolean = true;

	virtualParentMatrix: Mat4 = new Mat4();

	hideInvalidState = false;

	constructor() {
		super();

		this._rayNodeOffset = new Transform();
		this.addChild(this._rayNodeOffset);
	}

	set visible(v) {
		this._visible = !!v;
	}

	get visible() {
		return this._visible && (this.hideInvalidState ? this._valid : true);
	}

	set rayNode(v: Transform) {
		if (this._rayNode === v) {
			return;
		}

		this._rayNode?.setParent(null, true);

		this._rayNode = v;

		this._rayNode?.setParent(this._rayNodeOffset);
	}

	get rayNode() {
		return this._rayNode;
	}

	set source(v: XRInputSource) {
		if (this._source === v) {
			return;
		}

		const activeSource = this._source;

		if (this._source) {
			this._source.viewTransformNode = null;
		}

		this._source = v;
		this._valid = !!v;

		if (this._source) {
			this._source.viewTransformNode = this;
			this._updateDeltaSpace = true;
		}

		this.inputUpdated(activeSource, v);
	}

	get source() {
		return this._source;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected inputUpdated(from: XRInputSource, to: XRInputSource) {
		//
	}

	updateRayTransform({ lastXRFrame, space }: XRState) {
		if (!this._source) return;

		const rootPos = lastXRFrame.getPose(this._source.gripSpace, space);
		const rayPos = lastXRFrame.getPose(this._source.targetRaySpace, space);

		if (!rootPos || !rayPos) return;

		// world to local
		// we can use a matrix from XR because it Float32Array
		this._rayNodeOffset.matrix.multiply(rayPos.transform.inverse.matrix as any, rootPos.transform.matrix as any);
		this._rayNodeOffset.matrix.inverse();

		// apply offset
		this._rayNodeOffset.matrix.multiply(getCorrection(this._source, true).matrix);

		// decompose matrix to vectors
		this._rayNodeOffset.decompose();

		this._updateDeltaSpace = false;
	}

	updateMatrixWorld(force) {
		path_for_updateMatrixWorld.call(this, force);
	}

	update(state: XRState) {
		this.updateRayTransform(state);

		const { lastXRFrame, space } = state;

		if (!this._source || this._source.viewTransformNode !== this) {
			this._valid = false;
			return;
		}

		const pose = lastXRFrame.getPose(this._source.gripSpace, space);

		this._valid = !!pose;

		if (this.hideInvalidState) {
			this._rayNodeOffset.visible = this._valid;
		}

		if (!this._valid) {
			return;
		}

		this.virtualParentMatrix.copy(pose.transform.matrix as any);

		// apply correction
		this.virtualParentMatrix.multiply(getCorrection(this._source, false).matrix);

		this.worldMatrixNeedsUpdate = true;

		this._valid = true;
	}
}

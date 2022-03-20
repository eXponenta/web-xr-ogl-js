import { Mat4, Transform } from "ogl";
import { XRInputSource } from "webxr";
import { XRState } from "./XRRenderer";

type PathedTransform = Transform &  {
	__transfromPatched?: boolean;
	virtualParentMatrix?: Mat4;
}

function path_for_updateMatrixWorld(this: PathedTransform, force: boolean) {
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

const pathWorldTransform = (node: PathedTransform) => {
	if (!node || node.__transfromPatched) {
		return node;
	}

	node.__transfromPatched = true;
	node.updateMatrixWorld = path_for_updateMatrixWorld.bind(node);
	node.virtualParentMatrix = new Mat4();

	return node;
}

const restoreWorldTransfrom = (node: PathedTransform) => {
	if (!node || !node.__transfromPatched) {
		return node;
	}

	delete node.__transfromPatched;
	// delete override for instance, updateMatrixWorld will be readen from proto
	delete node.updateMatrixWorld;
	delete node.virtualParentMatrix;

	return node;
}

export class XRInputTransform extends Transform {
	private _source: XRInputSource & { viewTransfromNode?: XRInputTransform } | null;

	private _rayNode: PathedTransform | null;

	virtualParentMatrix: Mat4 = new Mat4();

	hideInvalidState: boolean = false;

	set rayNode (v: Transform) {
		if (this._rayNode === v) {
			return;
		}

		restoreWorldTransfrom(this._rayNode);

		this._rayNode?.setParent(null, true);

		this._rayNode = pathWorldTransform(v);

		this._rayNode?.setParent(this);
	}

	get rayNode() {
		return this._rayNode;
	}

	set source(v: XRInputSource) {
		if (this._source === v) {
			return;
		}

		if (this._source) {
			this._source.viewTransfromNode = null;
		}

		this._source = v;
		this.visible = !!v;

		if (this._source) {
			this._source.viewTransfromNode = this;
		}
	}

	get source() {
		return this._source;
	}

	updateMatrixWorld(force) {
		path_for_updateMatrixWorld.call(this, force);
    }

	updateRayTransfrom ({ lastXRFrame, space }: XRState) {
		if (!this._rayNode) {
			return;
		}

		if (!this._source) {
			this.hideInvalidState && (this._rayNode.visible = false);
			return;
		}

		const pose = lastXRFrame.getPose(this._source.targetRaySpace, space);

		if (!pose) {
			this.hideInvalidState && (this._rayNode.visible = false);
			return;
		}

		this.hideInvalidState && (this._rayNode.visible = true);

		this._rayNode.virtualParentMatrix.copy(pose.transform.matrix as any);

		this._rayNode.worldMatrixNeedsUpdate = true;
	}

	update (state: XRState) {
		this.updateRayTransfrom(state);

		const { lastXRFrame, space } = state;

		if (!this._source || this._source.viewTransfromNode !== this) {
			this.hideInvalidState && (this.visible = false);
			return;
		}

		const pose = lastXRFrame.getPose(this._source.gripSpace, space);

		if (!pose) {
			this.hideInvalidState && (this.visible = false);
			return;
		}

		this.hideInvalidState && (this.visible = true);

		this.virtualParentMatrix.copy(pose.transform.matrix as any);

		this.worldMatrixNeedsUpdate = true;
	}
}

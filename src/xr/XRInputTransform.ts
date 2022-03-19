import { Mat4, Transform } from "ogl";
import { XRInputSource } from "webxr";
import { XRState } from "./XRRenderer";

export class XRInputTransform extends Transform {
	private _source: XRInputSource & { viewTransfromNode?: XRInputTransform } | null;

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
		force = this.worldMatrixNeedsUpdate || force;

		this.worldMatrixNeedsUpdate = false;

		for (let i = 0, l = this.children.length; i < l; i++) {
            this.children[i].updateMatrixWorld(force);
        }
    }

	update ({ lastXRFrame, space }: XRState) {
		if (!this._source || this._source.viewTransfromNode !== this) {
			return;
		}

		const pose = lastXRFrame.getPose(this._source.gripSpace, space);

		if (!pose) {
			return;
		}

		this.worldMatrix.copy(pose.transform.matrix as any);

		this.worldMatrixNeedsUpdate = true;
		//this.updateMatrixWorld(true);
	}
}

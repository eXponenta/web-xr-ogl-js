import { Euler, Mat4, Quat, Vec3 } from 'ogl';
import type { XRInputSource } from 'webxr';

interface ICorrection {
	offset: Vec3 | Array<number>;
	rotation: Euler | Array<number>;
	quat: Quat | Array<number>;
	scale: Vec3 | Array<number>;
	matrix: Mat4;
}

interface ICorrectionRecord {
	controller?: ICorrection;
	ray?: ICorrection;
}

interface ICorrectionRecordModel {
	controller?: Partial<ICorrection>;
	ray?: Partial<ICorrection>;
}

export interface ICorrectionProfile {
	profile: string;
	handedness: { [key: string]: ICorrectionRecordModel };
}

export const DUMMY_CORRECTION: ICorrection = {
	offset: new Vec3(),
	rotation: new Euler(),
	quat: new Quat(),
	scale: new Vec3(1, 1, 1),
	matrix: new Mat4(),
};

export const CORRECTIONS = new Map<string, ICorrectionRecord>();

export const getCorrection = (input: XRInputSource, ray = false) => {
	const correction = CORRECTIONS.get(input.profiles[0] + input.handedness);

	if (!correction) return DUMMY_CORRECTION;

	const record = ray ? correction.ray : correction.controller;

	if (!record) return DUMMY_CORRECTION;

	if (!record.matrix) {
		record.matrix = new Mat4();
		record.matrix.compose(record.quat as Quat, record.offset as Vec3, record.scale as Vec3);
	}

	return record;
};

const normalize = (record: Partial<ICorrection>): ICorrection => {
	const rotation = new Euler(...(record.rotation || [0, 0, 0]));
	rotation.x *= Math.PI / 180;
	rotation.y *= Math.PI / 180;
	rotation.z *= Math.PI / 180;
	rotation.order = 'XYZ';

	// update lazy
	return {
		matrix: null,
		offset: new Vec3(...(record.offset || [0, 0, 0])),
		scale: new Vec3(...(record.scale || [1, 1, 1])),
		quat: new Quat().fromEuler(rotation),
		rotation,
	};
};

export const addCorrection = (record: ICorrectionProfile) => {
	if (!record.profile) {
		throw new Error('Correction profile must have valid profile name');
	}

	if (!record.handedness) return;

	for (const name in record.handedness) {
		const key = record.profile + name;
		const subRecords = record.handedness[name];

		CORRECTIONS.set(key, {
			ray: subRecords.ray ? normalize(subRecords.ray) : null,
			controller: subRecords.controller ? normalize(subRecords.controller) : null,
		});
	}
};

// oculus-touch-v3
addCorrection({
	profile: 'oculus-touch-v3',
	handedness: {
		left: {
			ray: { offset: [0.008, 0.008, 0.05], rotation: [0, -7, 0] },
		},
		right: {
			ray: { offset: [-0.008, 0.008, 0.05], rotation: [0, 7, 0] },
		},
	},
});

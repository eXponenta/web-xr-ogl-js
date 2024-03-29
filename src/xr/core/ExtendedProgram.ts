/* eslint-disable no-console */
/* eslint-disable no-multi-assign */
/* eslint-disable no-void */
/* eslint-disable no-use-before-define */
import type { IProgramInit, Program } from 'ogl';
import type { XRRenderer } from '../XRRenderer';
import { ProgramData } from './ProgramData';

let ID = 1;

// cache of typed arrays used to flatten uniform arrays
const arrayCacheF32 = {};

export interface IUniformRecord<V = any> {
	value?: V;
}

export interface IExtendProgramInit extends Omit<IProgramInit, 'vertex' | 'fragment'> {
	programData?: ProgramData;
	vertex?: string;
	fragment?: string;
}

export class ExtendedProgram<T extends string = ''> implements Program {
	readonly gl: GLContext & { renderer?: XRRenderer };

	readonly id: number;

	cullFace: number;

	frontFace: number;

	depthTest: boolean;

	depthWrite: boolean;

	depthFunc: number;

	blendFunc: Program['blendFunc'] = {};

	blendEquation: Program['blendEquation'] = {};

	transparent: boolean;

	uniforms: Record<T, IUniformRecord<any>>;

	_programData: ProgramData;

	constructor(
		gl: GLContext & { renderer?: XRRenderer },
		{
			vertex = '',
			fragment = '',
			programData = null,
			uniforms = {},
			transparent = false,
			cullFace = gl.BACK,
			frontFace = gl.CCW,
			depthTest = true,
			depthWrite = true,
			depthFunc = gl.LESS,
		}: IExtendProgramInit = {},
	) {
		if (!gl.canvas) console.error('gl not passed as fist argument to Program');
		this.gl = gl;
		this.uniforms = uniforms as any;
		this.id = ID++;

		if (!programData) {
			if (!vertex) console.warn('vertex shader not supplied');
			if (!fragment) console.warn('fragment shader not supplied');
		}

		// Store program state
		this.transparent = transparent;
		this.cullFace = cullFace;
		this.frontFace = frontFace;
		this.depthTest = depthTest;
		this.depthWrite = depthWrite;
		this.depthFunc = depthFunc;

		// set default blendFunc if transparent flagged
		if (this.transparent && !this.blendFunc.src) {
			if (this.gl.renderer.premultipliedAlpha) this.setBlendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
			else this.setBlendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
		}

		this.programData = programData || ProgramData.create(gl, { vertex, fragment });
	}

	set programData(p: ProgramData) {
		if (p === this._programData) {
			return;
		}

		if (!p) {
			throw new Error('ProgramData MUST be valid');
		}

		if (this._programData) {
			this._programData.usage--;
		}

		this._programData = p;

		this._programData.usage++;
	}

	get programData() {
		return this._programData;
	}

	/**
	 * Only for backward compatibility
	 * Internally we not should use this
	 */
	get uniformLocations() {
		return this.programData.uniformLocations;
	}

	get attributeLocations() {
		// we need this because Geometry use it
		return this.programData.attributeLocations;
	}

	get attributeOrder() {
		// we need this because a Geometry use it
		return this.programData.attributeOrder;
	}

	/**
	 * WebGLProgram instance, can be shared
	 * Only for backward compatibility
	 * Internally we not should use this
	 */
	get program() {
		return this.programData.program;
	}

	setBlendFunc(src, dst, srcAlpha?, dstAlpha?) {
		this.blendFunc.src = src;
		this.blendFunc.dst = dst;
		this.blendFunc.srcAlpha = srcAlpha;
		this.blendFunc.dstAlpha = dstAlpha;
	}

	setBlendEquation(modeRGB, modeAlpha) {
		this.blendEquation.modeRGB = modeRGB;
		this.blendEquation.modeAlpha = modeAlpha;
	}

	/**
	 * Fixed version
	 * @see https://github.com/oframe/ogl/issues/140
	 */
	applyState() {
		if (this.depthTest) this.gl.renderer.enable(this.gl.DEPTH_TEST);
		else this.gl.renderer.disable(this.gl.DEPTH_TEST);

		if (this.cullFace) this.gl.renderer.enable(this.gl.CULL_FACE);
		else this.gl.renderer.disable(this.gl.CULL_FACE);

		if (this.transparent) this.gl.renderer.enable(this.gl.BLEND);
		else this.gl.renderer.disable(this.gl.BLEND);

		if (this.cullFace) this.gl.renderer.setCullFace(this.cullFace);
		this.gl.renderer.setFrontFace(this.frontFace);
		this.gl.renderer.setDepthMask(this.depthWrite);
		this.gl.renderer.setDepthFunc(this.depthFunc);
		if (this.transparent)
			this.gl.renderer.setBlendFunc(
				this.blendFunc.src,
				this.blendFunc.dst,
				this.blendFunc.srcAlpha,
				this.blendFunc.dstAlpha,
			);
		this.gl.renderer.setBlendEquation(this.blendEquation.modeRGB, this.blendEquation.modeAlpha);
	}

	use({ flipFaces = false } = {}) {
		let textureUnit = -1;

		const { gl, uniforms, programData } = this;
		const { uniformLocations } = this.programData;
		const programActive = gl.renderer.state.currentProgram === programData.id;

		// Avoid gl call if program already in use
		if (!programActive) {
			gl.useProgram(programData.program);
			gl.renderer.state.currentProgram = programData.id;
		}

		// Set only the active uniforms found in the shader
		uniformLocations.forEach((location, activeUniform) => {
			let name = activeUniform.uniformName;

			// get supplied uniform
			let uniform = uniforms[name];

			// For structs, get the specific property instead of the entire object
			if (activeUniform.isStruct) {
				uniform = uniform[activeUniform.structProperty];
				name += `.${activeUniform.structProperty}`;
			}
			if (activeUniform.isStructArray) {
				uniform = uniform[activeUniform.structIndex][activeUniform.structProperty];
				name += `[${activeUniform.structIndex}].${activeUniform.structProperty}`;
			}

			if (!uniform) {
				return warn(`Active uniform ${name} has not been supplied`);
			}

			if (uniform && uniform.value === undefined) {
				return warn(`${name} uniform is missing a value parameter`);
			}

			if (uniform.value.texture) {
				// eslint-disable-next-line operator-assignment
				textureUnit = textureUnit + 1;

				// Check if texture needs to be updated
				uniform.value.update(textureUnit);
				return setUniform(gl, activeUniform.type, location, textureUnit);
			}

			// For texture arrays, set uniform as an array of texture units instead of just one
			if (uniform.value.length && uniform.value[0].texture) {
				const textureUnits = [];
				uniform.value.forEach((value) => {
					// eslint-disable-next-line operator-assignment
					textureUnit = textureUnit + 1;
					value.update(textureUnit);
					textureUnits.push(textureUnit);
				});

				return setUniform(gl, activeUniform.type, location, textureUnits);
			}

			return setUniform(gl, activeUniform.type, location, uniform.value);
		});

		this.applyState();
		if (flipFaces) gl.renderer.setFrontFace(this.frontFace === gl.CCW ? gl.CW : gl.CCW);
	}

	remove() {
		this.programData && this.programData.remove();
		this.programData = null;
	}
}

function setUniform(gl, type, location, value) {
	value = value.length ? flatten(value) : value;
	const setValue = gl.renderer.state.uniformLocations.get(location);

	// Avoid redundant uniform commands
	if (value.length) {
		if (setValue === undefined || setValue.length !== value.length) {
			// clone array to store as cache
			gl.renderer.state.uniformLocations.set(location, value.slice(0));
		} else {
			if (arraysEqual(setValue, value)) return void 0;

			// Update cached array values
			if (setValue.set) {
				setValue.set(value);
			} else {
				setArray(setValue, value);
			}
			gl.renderer.state.uniformLocations.set(location, setValue);
		}
	} else {
		if (setValue === value) return void 0;
		gl.renderer.state.uniformLocations.set(location, value);
	}

	switch (type) {
		case 5126:
			return value.length ? gl.uniform1fv(location, value) : gl.uniform1f(location, value); // FLOAT
		case 35664:
			return gl.uniform2fv(location, value); // FLOAT_VEC2
		case 35665:
			return gl.uniform3fv(location, value); // FLOAT_VEC3
		case 35666:
			return gl.uniform4fv(location, value); // FLOAT_VEC4
		case 35670: // BOOL
		case 5124: // INT
		case 35678: // SAMPLER_2D
		case 35680:
			return value.length ? gl.uniform1iv(location, value) : gl.uniform1i(location, value); // SAMPLER_CUBE
		case 35671: // BOOL_VEC2
		case 35667:
			return gl.uniform2iv(location, value); // INT_VEC2
		case 35672: // BOOL_VEC3
		case 35668:
			return gl.uniform3iv(location, value); // INT_VEC3
		case 35673: // BOOL_VEC4
		case 35669:
			return gl.uniform4iv(location, value); // INT_VEC4
		case 35674:
			return gl.uniformMatrix2fv(location, false, value); // FLOAT_MAT2
		case 35675:
			return gl.uniformMatrix3fv(location, false, value); // FLOAT_MAT3
		case 35676:
			return gl.uniformMatrix4fv(location, false, value); // FLOAT_MAT4
		default:
			return void 0;
	}
}

function flatten(a) {
	const arrayLen = a.length;
	const valueLen = a[0].length;
	if (valueLen === undefined) return a;
	const length = arrayLen * valueLen;
	let value = arrayCacheF32[length];
	if (!value) arrayCacheF32[length] = value = new Float32Array(length);
	for (let i = 0; i < arrayLen; i++) value.set(a[i], i * valueLen);
	return value;
}

function arraysEqual(a, b) {
	if (a.length !== b.length) return false;
	for (let i = 0, l = a.length; i < l; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

function setArray(a, b) {
	for (let i = 0, l = a.length; i < l; i++) {
		a[i] = b[i];
	}
}

let warnCount = 0;
function warn(message) {
	if (warnCount > 100) return;
	console.warn(message);
	warnCount++;
	if (warnCount > 100) console.warn('More than 100 program warnings - stopping logs.');
}

/* eslint-disable no-console */
/* eslint-disable prefer-destructuring */
/**
 * Internal program data class, storing shader data for each Program instance
 * Used for reusing a native program for different Ogl programs without re-use of base shader.
 */

// generate more stable UUID
// eslint-disable-next-line no-bitwise
const genID = () => [...Array(4)].reduce((acc, _, i) => acc | (((Math.random() * 256) | 0) << i), 0);

type IActiveUniform = WebGLActiveInfo & {
	uniformName?: string;
	isStruct?: boolean;
	isStructArray?: boolean;
	structIndex?: number;
	structProperty?: string;
};

export class ProgramData {
	/**
	 * @type {Map<string, ProgramData>}
	 */
	static CACHE = new Map();

	/**
	 * Create or return already existed program data for current shaders source
	 * @param { WebGLRenderingContext | WebGL2RenderingContext } gl
	 * @param {{ vertex: string, fragment: string}} param1
	 * @returns
	 */
	static create(gl, { vertex, fragment }) {
		return this.CACHE.get(vertex + fragment) || new ProgramData(gl, { vertex, fragment });
	}

	readonly gl: GLContext;

	readonly vertex: string;

	readonly fragment: string;

	readonly uniformLocations: Map<IActiveUniform, WebGLUniformLocation> = new Map();

	readonly attributeLocations: Map<WebGLActiveInfo, number> = new Map();

	// eslint-disable-next-line no-bitwise
	readonly id = genID();

	program: WebGLProgram;

	attributeOrder = '';

	usage = 0;

	constructor(gl, { vertex, fragment }) {
		this.gl = gl;
		this.vertex = vertex;
		this.fragment = fragment;

		ProgramData.CACHE.set(this.vertex + this.fragment, this);

		this.compile();
	}

	compile() {
		if (this.program) {
			return this;
		}

		const { gl, vertex, fragment } = this;

		// compile vertex shader and log errors
		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, vertex);
		gl.compileShader(vertexShader);
		if (gl.getShaderInfoLog(vertexShader) !== '') {
			// eslint-disable-next-line no-use-before-define
			console.warn(`${gl.getShaderInfoLog(vertexShader)}\nVertex Shader\n${addLineNumbers(vertex)}`);
		}

		// compile fragment shader and log errors
		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, fragment);
		gl.compileShader(fragmentShader);
		if (gl.getShaderInfoLog(fragmentShader) !== '') {
			// eslint-disable-next-line no-use-before-define
			console.warn(`${gl.getShaderInfoLog(fragmentShader)}\nFragment Shader\n${addLineNumbers(fragment)}`);
		}

		// compile program and log errors
		this.program = gl.createProgram();
		gl.attachShader(this.program, vertexShader);
		gl.attachShader(this.program, fragmentShader);
		gl.linkProgram(this.program);
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.warn(gl.getProgramInfoLog(this.program));
			return this;
		}

		// Remove shader once linked
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		// Get active uniform locations
		const numUniforms = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
		for (let uIndex = 0; uIndex < numUniforms; uIndex++) {
			const uniform = gl.getActiveUniform(this.program, uIndex) as IActiveUniform;
			this.uniformLocations.set(uniform, gl.getUniformLocation(this.program, uniform.name));

			// split uniforms' names to separate array and struct declarations
			const split = uniform.name.match(/(\w+)/g);

			// eslint-disable-next-line prefer-destructuring
			uniform.uniformName = split[0];

			if (split.length === 3) {
				uniform.isStructArray = true;
				uniform.structIndex = Number(split[1]);
				uniform.structProperty = split[2];
			} else if (split.length === 2 && Number.isNaN(Number(split[1]))) {
				uniform.isStruct = true;
				uniform.structProperty = split[1];
			}
		}

		// Get active attribute locations
		const locations = [];
		const numAttribs = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
		for (let aIndex = 0; aIndex < numAttribs; aIndex++) {
			const attribute = gl.getActiveAttrib(this.program, aIndex);
			const location = gl.getAttribLocation(this.program, attribute.name);
			locations[location] = attribute.name;
			this.attributeLocations.set(attribute, location);
		}

		this.attributeOrder = locations.join('');
		return this;
	}

	remove() {
		this.usage--;

		if (this.usage <= 0 && this.program) {
			this.gl.deleteProgram(this.program);

			ProgramData.CACHE.delete(this.vertex + this.fragment);
		}

		(this as any).id = -1;
		(this as any).fragment = null;
		(this as any).vertex = null;
		this.attributeLocations.clear();
		this.attributeOrder = '';
		this.uniformLocations.clear();
	}
}

function addLineNumbers(string) {
	const lines = string.split('\n');
	for (let i = 0; i < lines.length; i++) {
		// eslint-disable-next-line prefer-template
		lines[i] = i + 1 + ': ' + lines[i];
	}
	return lines.join('\n');
}

// type declaration for ogl
// not all fields is re-typed, only that needed
// plz, add fields that needed

type GLContext = WebGL2RenderingContext | WebGLRenderingContext;

declare module 'ogl' {
	type ICameraInit = ICameraPerspectiveInit | ICameraOrthoInit;

	type IVec3Arr = [number, number, number];

	type Scene = Transform;

	interface ICameraPerspectiveInit {
		near?: number;
		far?: number;
		fov?: number;
		aspect?: number;
	}

	interface ICameraOrthoInit {
		left?: number;
		right?: number;
		bottom?: number;
		top?: number;
		zoom?: number;
	}

	interface IRendererState {
		viewport: {
			x: number;
			y: number;
			width: number;
			height: number;
		}
	}

	interface IRenderTarget {

	}

	interface RendererOptions {
		canvas?: HTMLCanvasElement;
		width?: number;
		height?: number;
		dpr?: number;
		alpha?: boolean;
		depth?: boolean;
		stencil?: boolean;
		antialias?: boolean;
		premultipliedAlpha?: boolean;
		preserveDrawingBuffer?: boolean;
		powerPreference?: string;
		autoClear?: boolean;
		webgl?: number;
	}

	interface IRenderTaskOptions {
		camera: Camera;
		scene: Scene;
		target?: IRenderTarget;
		clear?: boolean;
		update?: boolean;
		sort?: boolean;
		frustumCull?: boolean;
	}

	interface IProgramInit {
		vertex: string;
		fragment: string;
		uniforms?: Record<string, any>;
		transparent?: boolean;
		cullFace?: number;
		frontFace?: number;
		depthTest?: boolean
		depthWrite?: boolean;
		depthFunc?: boolean;
	}

	class Vec3 extends Array<number> {
		set x(v: number);
		get x(): number;

		set y(v: number);
		get y(): number;

		set z(v: number);
		get z(): number;

		constructor(x?: number, y?: number, z?: number);

		set (x?: number, y?: number, z?: number): this;
	}

	class Quat extends Array<number> {
		set x(v: number);
		get x(): number;

		set y(v: number);
		get y(): number;

		set z(v: number);
		get z(): number;

		set w(v: number);
		get w(): number;

		constructor(x?: number, y?: number, z?: number, w?: number);

		set (x?: number, y?: number, z?: number, w?: number): this;
	}

	class Euler extends Array<[number, number, number]> {
		set x(v: number);
		get x(): number;

		set y(v: number);
		get y(): number;

		set z(v: number);
		get z(): number;

		constructor (x?: number, y?: number, z?: number, order?: 'YXZ');
	}

	class Renderer {
		readonly gl: GLContext & {canvas: HTMLCanvasElement, renderer: Renderer};
		readonly state: IRendererState;
		readonly dpr: number;
		readonly alpha: boolean;
		readonly color: boolean;
		readonly depth: boolean;
	 	readonly stencil: boolean;
		readonly premultipliedAlpha: boolean;
		readonly isWebgl2: boolean;

		autoClear: boolean;
		width: number;
		height: number;

		constructor (options: any);

		render (options: IRenderTaskOptions);

		setSize (width: number, height: number);
	}

	class Transform {
		readonly position: Vec3;
		readonly rotation: Euler;
		readonly quaternion: Quat;

		constructor ();

		lookAt(vec3: IVec3Arr | Vec3, invert?: boolean): this;

		setParent(node: Transform, setParent?: boolean): void;
	}

	class Camera extends Transform {
		constructor (gl: GLContext, options: ICameraInit);

		lookAt(vec3: IVec3Arr | Vec3): this;

		perspective(options: ICameraPerspectiveInit): this;

		orthographic(options: ICameraOrthoInit): this;
	}

	class Program {
		uniforms: Record<string, any>;
		attributeLocations: Array<WebGLActiveInfo>;

		constructor(gl: GLContext, options?: IProgramInit);

		use (options: any): void;
	}

	class Mesh extends Transform {
		constructor(gl: GLContext, options?: any);
	}

	class Plane extends Mesh {}

	class Sphere extends Mesh {}

	class Box extends Mesh {}

	class Cylinder extends Mesh {}
}

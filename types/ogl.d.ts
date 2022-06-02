/* eslint-disable no-use-before-define */
/* eslint-disable max-classes-per-file */
// type declaration for ogl
// not all fields is re-typed, only that needed
// plz, add fields that needed

type GLContext = WebGL2RenderingContext | WebGLRenderingContext;

declare module 'ogl' {
	type IImageSource =
		| HTMLImageElement
		| ArrayBuffer
		| ArrayBufferView
		| HTMLCanvasElement
		| ImageBitmap
		| HTMLVideoElement;
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
		};

		textureUnits: Array<any>;
		activeTextureUnit: number;
		currentProgram: number;
		clearColor: [number, number, number, number];
	}

	interface IRenderTarget {
		width: number;
		height: number;
		depth: boolean;
		target: number;
		buffer: WebGLFramebuffer;
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
		depthTest?: boolean;
		depthWrite?: boolean;
		depthFunc?: number;
	}

	interface ITextureOptions<T extends IImageSource> {
		image?: T;
		target?: number;
		type?: number;
		format?: number;
		internalFormat?: number;
		wrapS?: number;
		wrapT?: number;
		generateMipmaps?: boolean;
		minFilter?: number;
		magFilter?: number;
		premultiplyAlpha?: boolean;
		unpackAlignment?: number;
		flipY?: boolean;
		anisotropy?: number;
		level?: number;
		width?: number;
		height?: number;
	}

	class Color extends Array<number> {
		constructor(color: Array<number> | number | string);

		set r(v: number);

		get r(): number;

		set g(v: number);

		get g(): number;

		set b(v: number);

		get b(): number;

		set(color: Array<number> | number | string): this;

		copy(color: Color): this;
	}

	class Vec3 extends Array<number> {
		set x(v: number);

		get x(): number;

		set y(v: number);

		get y(): number;

		set z(v: number);

		get z(): number;

		constructor(x?: number, y?: number, z?: number);

		set(x?: number, y?: number, z?: number): this;

		copy(from: Vec3): this;

		applyMatrix4(mat: Mat4): this;
	}

	class Vec2 extends Array<number> {
		set x(v: number);

		get x(): number;

		set y(v: number);

		get y(): number;

		constructor(x?: number, y?: number);

		set(x?: number, y?: number): this;
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

		set(x?: number, y?: number, z?: number, w?: number): this;

		fromEuler(e: Euler): this;
	}

	class Euler extends Array<number> {
		order: string;

		set x(v: number);

		get x(): number;

		set y(v: number);

		get y(): number;

		set z(v: number);

		get z(): number;

		constructor(x?: number, y?: number, z?: number, order?: 'YXZ');
	}

	class Mat4 extends Array<number> {
		copy(source: Mat4 | Float32Array): this;

		multiply(a: Mat4, b?: Mat4): this;

		inverse(mat?: Mat4): Mat4;

		getRotation(q: Quat): this;

		getTranslation(v: Vec3): this;

		getScaling(v: Vec3): this;

		compose(rot: Quat, pos: Vec3, scale: Vec3): this;
	}

	class Renderer {
		readonly gl: GLContext & {
			canvas: HTMLCanvasElement;
			renderer: Renderer;
		};

		readonly state: IRendererState;

		readonly dpr: number;

		readonly alpha: boolean;

		readonly color: boolean;

		readonly depth: boolean;

		readonly stencil: boolean;

		readonly premultipliedAlpha: boolean;

		readonly isWebgl2: boolean;

		protected currentProgram: number;

		autoClear: boolean;

		width: number;

		height: number;

		currentGeometry: string;

		constructor(options: any);

		render(options: IRenderTaskOptions);

		setSize(width: number, height: number);

		bindFramebuffer(framebufferLike?: { target?: number; buffer?: WebGLFramebuffer }): void;

		protected sortTransparent(a: Transform, b: Transform): number;

		protected sortOpaque(a: Transform, b: Transform): number;

		protected sortUI(a: Transform, b: Transform): number;

		setFrontFace(face: number): void;

		setCullFace(cull: number): void;

		setViewport(w: number, h: number): void;

		enable(state: number): void;

		disable(state: number): void;

		setDepthMask(state: boolean): void;

		setDepthFunc(state: number): void;

		setBlendFunc(src: number, dst: number, srcAlpha?: number, dstAlpha?: number): void;

		setBlendEquation(modeRGB: number, modeAlpha?: number): void;

		bindVertexArray(vao: WebGLVertexArrayObject): void;

		activeTexture(target: number): void;
	}

	class Transform {
		readonly worldMatrix: Mat4;

		readonly matrix: Mat4;

		readonly position: Vec3;

		readonly scale: Vec3;

		readonly rotation: Euler;

		readonly quaternion: Quat;

		readonly children: Transform[];

		set visible(v: boolean);

		get visible(): boolean;

		worldMatrixNeedsUpdate: boolean;

		matrixAutoUpdate: boolean;

		parent: Transform;

		constructor();

		lookAt(vec3: IVec3Arr | Vec3, invert?: boolean): this;

		setParent(node: Transform, notifyParent?: boolean): void;

		addChild(node: Transform, notifyChild?: boolean): void;

		removeChild(node: Transform, notifyChild?: boolean): void;

		updateMatrixWorld(force?: boolean): void;

		updateMatrix(): void;

		traverse(callback: (node: Transform) => true | void): void;

		decompose(): void;
	}

	class Camera extends Transform {
		projectionMatrix: Mat4;

		constructor(gl: GLContext, options: ICameraInit);

		lookAt(vec3: IVec3Arr | Vec3): this;

		perspective(options: ICameraPerspectiveInit): this;

		orthographic(options: ICameraOrthoInit): this;
	}

	class Program {
		uniforms: Record<string, any>;

		attributeLocations: Map<WebGLActiveInfo, number>;

		attributeOrder: string;

		transparent: boolean;

		depthTest: boolean;

		depthWrite: boolean;

		blendFunc: {
			src?: number;
			dst?: number;
			srcAlpha?: number;
			dstAlpha?: number;
		};

		blendEquation: {
			modeRGB?: number;
			modeAlpha?: number;
		};

		constructor(gl: GLContext, options?: IProgramInit);

		use(options: any): void;

		setBlendFunc(src: number, dst: number, srcAlpha?: number, dstAlpha?: number): void;

		setBlendEquation(modeRGB: number, modeAlpha?: number): void;
	}

	class Texture<T extends IImageSource = HTMLImageElement> {
		texture: WebGLTexture;

		width: number;

		height: number;

		get image(): T;

		set image(v: T);

		needsUpdate: boolean;

		generateMipmaps: boolean;

		onUpdate?: () => void;

		// injected
		_onUpdateCached: () => void;

		constructor(gl: GLContext, options?: ITextureOptions<T>);

		bind(): void;

		update(args?: any): void;
	}

	class Mesh<G = object, P = Program> extends Transform {
		geometry: G;

		program: P;

		get renderOrder(): number;

		set renderOrder(v: number);

		constructor(gl: GLContext, options?: { program: P, geometry: G });

		public draw(options: { camera: Camera }): void;
	}

	class Geometry {
		readonly attributes: Record<string, any>;

		readonly isInstanced: boolean;

		constructor(gl: GLContext, options?: any);

		flipNormal: boolean;
	}

	class Plane extends Geometry {}

	class Sphere extends Geometry {}

	class Box extends Geometry {}

	class Cylinder extends Geometry {}

	interface IHitResult {
		localPoint: Vec3;
		point: Vec3;
		distance: number;
		faceNormal?: Vec3;
		localFaceNormal?: Vec3;
		localNormal?: Vec3;
		normal?: Vec3;
		uv?: Vec2;
	}

	interface IMeshRaycastInit {
		cullFace?: boolean;
		maxDistance?: number;
		includeUV?: boolean;
		includeNormal?: boolean;
		output?: Array<Mesh<any, any> & { hit?: IHitResult }>;
	}

	class Raycast {
		public readonly origin: Vec3;

		public readonly direction: Vec3;

		public valid?: boolean;

		intersectMeshes(meshes, options?: IMeshRaycastInit): IMeshRaycastInit['output'];
	}

	interface GLTFAsset {
		json: any;
		buffers: any;
		bufferViews: any;
		images: any;
		textures: any;
		materials: any;
		meshes: { primitives: Mesh[] }[];
		nodes: Transform[];
		lights: any;
		animations: any;
		scenes: Transform[][];
		scene: Transform[];
	}
	class GLTFLoader {
		static load(gl: GLContext, url: string): Promise<GLTFAsset>;
	}

	class NormalProgram extends Program {}
}

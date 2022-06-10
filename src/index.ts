import {
	Camera,
	Transform,
	Texture,
	Box,
	Mesh,
	NormalProgram
} from "ogl";
import { XRInputSource } from "webxr";
import { XRRenderTarget } from "./xr";
import { OGLQuadLayer, OGLXRLayer } from "./xr/layers/";
import { XRInputModel } from "./xr/XRInputModel";
import { XRRenderer } from "./xr/XRRenderer";

const params = new URLSearchParams(window.location.search);

const requestButton = document.querySelector("#request-xr");
const canvas = document.createElement("canvas");
const renderer = new XRRenderer({
	dpr: window.devicePixelRatio,
	canvas,
	antialias: true,
	autoClear: true,
});

renderer.frustumCull = false;

document.body.appendChild(canvas);

XRRenderTarget.USE_MSAA_TEXTURE_WHEN_EXIST = !params.get('no-ext');

OGLXRLayer.ALLOW_NATIVE = true;

OGLXRLayer.ALLOW_ALPHA_CLIP = false;

/**
 * @type {WebGLRenderingContext}
 */
const gl = renderer.gl;

const genCanvasLayer = ({ width = 200, height = 100, fill = '#ccc', outline = 'red', name = 'Layer 1' } = {}) => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	canvas.width = width;
	canvas.height = height;

	const draw = (text) => {
		ctx.fillStyle = fill;
		ctx.strokeStyle = outline;
		ctx.lineWidth = 3;

		ctx.fillRect(0, 0, width, height);
		ctx.strokeRect(10, 10, width - 20, height - 20);

		ctx.fillStyle = outline;
		ctx.font = 'Arial 32px';

		ctx.fillText(text, 10 * 2 + 5, 10 * 2 + 5);
	}

	draw(name);

	const t = new Texture(gl, { image: canvas });
	const l = new OGLQuadLayer({ width: width / 400, height: height / 400, viewPixelHeight: height, viewPixelWidth: width });

	l.texture = t;

	let index = 0;

	return {
		layer: l,

		tick() {
			draw(name + ' -- ' + (index++));
			t.image = canvas;
			t.needsUpdate = true;
			l.contentDirty = true;
		}
	}
}

const textCanvas = document.createElement('canvas');
textCanvas.width = 1024;
textCanvas.height = 512;

gl.clearColor(1, 1, 1, 1);

const camera = new Camera(gl, { fov: 90 });
camera.lookAt([0, 0, 0]);

function resize() {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
}
window.addEventListener("resize", resize, false);
resize();


requestButton.addEventListener("click", async () => {
	await renderer.requestXR();
});

const cube = new Mesh(gl, {
	geometry: new Box(gl, { width: 10, height: 10, depth: 10 }),
	program: new NormalProgram(gl)
})

const scene = new Transform();

const layer1 = genCanvasLayer({width: 300, height: 200});

const board = new Transform();

board.position.set(0, 0, -2);

board.addChild(layer1.layer);
scene.addChild(board);
scene.addChild(cube)

//emulate loop lag
const longTask = ()=> {
	const start = performance.now();
	let i = 100_000_000;
	while(i-- > 0) {};

	console.log(performance.now() - start);
}

const map = new Map<XRInputSource, XRInputModel>();

const rayLiner = () => {
	const geometry = new Box(gl, { width: 0.01, height: 0.01 });
	const t = new Mesh<Box, NormalProgram> (gl, { program: new NormalProgram(gl), geometry });
	t.scale.set(1, 1, 0.2);
	t.position.set(0, 0, -0.1);
	return t;
};

renderer.xr.addEventListener('xrinputsourceschange', (e) => {
	const inputs = [...renderer.xr.inputSources] as XRInputSource[];
	const last = [...map.keys()];
	const added = inputs.filter(e => !last.includes(e));
	const removed = last.filter(e => !inputs.includes(e));

	removed.forEach((e) => {
		const m = map.get(e);

		m.source = null;
		m.setParent(null);

		map.delete(e);
	});

	added.forEach((e)=>{
		const model = new XRInputModel(gl, { inputSource: e });
		model.rayNode = rayLiner();
		scene.addChild(model);
		map.set(e, model);
	});
});


renderer.requestAnimationFrame(update);

function update() {
	renderer.requestAnimationFrame(update);
	layer1.tick();
	renderer.render({ scene, camera });
}

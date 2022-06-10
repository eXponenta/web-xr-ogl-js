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

document.body.appendChild(canvas);

OGLXRLayer.ALLOW_NATIVE = true;
OGLXRLayer.ALLOW_ALPHA_CLIP = true;

/**
 * @type {WebGLRenderingContext}
 */
const gl = renderer.gl;

const genCanvasLayer = ({ width = 200, height = 100, fill = '#ccc', outline = 'red', name = 'Layer 1' } = {}) => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	canvas.width = width;
	canvas.height = height;

	ctx.fillStyle = fill;
	ctx.strokeStyle = outline;
	ctx.lineWidth = 3;

	ctx.fillRect(0, 0, width, height);
	ctx.strokeRect(10, 10, width - 20, height - 20);

	ctx.fillStyle = outline;
	ctx.font = 'Arial 32px';

	ctx.fillText(name, 10 * 2 + 5, 10 * 2 + 5);

	const t = new Texture(gl, { image: canvas });
	const l = new OGLQuadLayer({ width: width / 400, height: height / 400, viewPixelHeight: height, viewPixelWidth: width });

	l.texture = t;

	return l;
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

const scene = new Transform();
scene.position.set(0, 0, -2);

const layer1 = genCanvasLayer({width: 300, height: 200});
const layer2 = genCanvasLayer({width: 100, height: 200, name: 'Vert Layer', fill: '#22cc22', outline: 'blue'});
const layer3 = genCanvasLayer({width: 300, height: 200, fill: '#cc2222', outline: '#ccc'});

const layer4 = genCanvasLayer({width: 300, height: 200, fill: 'blue', outline: 'white', name: 'Out of board'});

layer1.position.x -= 2;
layer1.rotation.y = Math.PI / 6;
layer3.position.x = 2;
layer3.rotation.y = -Math.PI / 6;

const board = new Transform();
board.addChild(layer1);
board.addChild(layer2);
board.addChild(layer3);

const outOfBoardTree = new Transform();
outOfBoardTree.addChild(layer4);

scene.addChild(board);
scene.addChild(outOfBoardTree);

outOfBoardTree.visible = false;

//emulate loop lag
const longTask = ()=> {
	const start = performance.now();
	let i = 100_000_000;
	while(i-- > 0) {};

	console.log(performance.now() - start);
}

const flipBoards = () => {
	longTask();

	outOfBoardTree.visible = !outOfBoardTree.visible;
	board.visible = !outOfBoardTree.visible;
}

const map = new Map<XRInputSource, XRInputModel>();

const rayLiner = () => {
	const geometry = new Box(gl, { width: 0.01, height: 0.01 });
	const t = new Mesh<Box, NormalProgram> (gl, { program: new NormalProgram(gl), geometry });
	t.scale.set(1, 1, 0.2);
	t.position.set(0, 0, -0.1);
	return t;
};

renderer.xr.addEventListener('xrstart', () => {
	renderer.xr.session.addEventListener('selectstart', flipBoards);
});

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
	renderer.render({ scene, camera });
}

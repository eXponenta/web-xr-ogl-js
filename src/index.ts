import {
	Camera,
	Transform,
	Texture,
	Box,
	Mesh,
	NormalProgram
} from "ogl";
import { XRInputSource } from "webxr";
import { OGLQuadLayer } from "./xr/layers/";
import { XRInputModel } from "./xr/XRInputModel";
import { XRRenderer } from "./xr/XRRenderer";

{

	const requestButton = document.querySelector("#request-xr");
	const canvas = document.createElement("canvas");
	const renderer = new XRRenderer({
		dpr: window.devicePixelRatio,
		canvas,
		antialias: true,
		autoClear: true,
	});

	document.body.appendChild(canvas);

	/**
	 * @type {WebGLRenderingContext}
	 */
	const gl = renderer.gl;

	const textCanvas = document.createElement('canvas');
	textCanvas.width = 1024;
	textCanvas.height = 512;

	const textContext = textCanvas.getContext('2d');

	const gridTexture = new Texture<HTMLCanvasElement>(gl, {image: textCanvas});// new CheckmateTexture(gl, {width: 1024, height: 1024, count: 4})

	let last = 0;
	let avg = 0;

	function updateText () {
		let fps = 0;

		if (last == 0) {
			last = performance.now();
		} else {
			fps = 1000 / (performance.now() - last);
			avg = avg * 0.9 + fps * 0.1;
			last = performance.now();
		}

		textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);

		textContext.strokeStyle = 'red';
		textContext.lineWidth = 10;
		textContext.strokeRect(0,0, textCanvas.width, textCanvas.height);

		textContext.fillStyle = 'white';
		textContext.font = '100px Arial';
		textContext.textAlign = 'center';
		textContext.fillText(
			"Frame: " + avg.toFixed(0),
			textCanvas.width / 2, 50 + textCanvas.height / 2, textCanvas.width
		)

		gridTexture.needsUpdate = true;
	}

	gl.clearColor(1, 1, 1, 1);

	const camera = new Camera(gl, { fov: 90 });
	camera.lookAt([0, 0, 0]);
	camera.position.set(0, 1.6, 0);

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
	scene.position.set(0, 1, -4);

	const planeLayer = new OGLQuadLayer({
		width: 2,
		height: 1,
		viewPixelHeight: gridTexture.image.height,
		viewPixelWidth: gridTexture.image.width
	})

	planeLayer.texture = gridTexture;


	scene.addChild(planeLayer);

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
			map.get(e).setParent(null);
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
	/**
	 *
	 * @param {number} time
	 * @param {import('webxr').XRFrame} [frame]
	 */
	function update(time, frame = null) {
		renderer.requestAnimationFrame(update);

		updateText();

		planeLayer.rotation.y -= 0.02;

		planeLayer.contentDirty = true;

		renderer.gl.clearColor(0,0,0,0);

		renderer.render({ scene, camera });
	}
}

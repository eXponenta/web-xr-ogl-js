import {
	Camera,
	Transform,
	Texture,
} from "ogl";
import { XRQuadLayer } from "webxr";
import { OGLQuadLayer, OGLXRLayer } from "./xr/layers/";
import { XRRenderer } from "./xr/XRRenderer";

{


	const requiestButton = document.querySelector("#requiest-xr");
	const canvas = document.createElement("canvas");
	const renderer = new XRRenderer({
		dpr: 2,
		canvas,
		antialias: true,
		autoClear: true,
	});

	document.querySelector('#react-content').appendChild(canvas);

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


	let planeLayer: OGLXRLayer<XRQuadLayer>;

	requiestButton.addEventListener("click", async () => {
		await renderer.requestXR();
	});

	const scene = new Transform();
	scene.position.set(0, 1, -4);

	planeLayer = new OGLQuadLayer({
		width: 2,
		height: 1,
		viewPixelHeight: gridTexture.image.height,
		viewPixelWidth: gridTexture.image.width
	})

	scene.addChild(planeLayer);


	renderer.requestAnimationFrame(update);
	/**
	 *
	 * @param {number} time
	 * @param {import('webxr').XRFrame} [frame]
	 */
	function update(time, frame = null) {
		renderer.requestAnimatioFrame(update);

		updateText();

		planeLayer.rotation.y -= 0.02;

		planeLayer.referencedTexture = gridTexture;
		planeLayer.contentDirty = true;

		renderer.gl.clearColor(0,0,0,0);

		renderer.render({ scene, camera });
	}
}

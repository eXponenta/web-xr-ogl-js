import {
	Camera,
	Transform,
	Mesh,
	Sphere,
	Box,
	Cylinder,
	Texture,
} from "ogl";
import { XRQuadLayer } from "webxr";
import { PrimitiveMaterial } from "./primitives/PrimitiveMaterial";
import { CheckmateTexture } from "./utils/ChekmateTexture";
import { OGLXRLayer } from "./xr/OGLXRLayer";
import { XRRenderer } from "./xr/XRRenderer";

{


	const requiestButton = document.querySelector("#requiest-xr");
	const canvas = document.querySelector("#frame");
	const renderer = new XRRenderer({
		dpr: 2,
		canvas,
		antialias: true,
		autoClear: true,
	});

	/**
	 * @type {WebGLRenderingContext}
	 */
	const gl = renderer.gl;

	const textCanvas = document.createElement('canvas');
	textCanvas.width = 1024;
	textCanvas.height = 512;

	const textContext = textCanvas.getContext('2d');

	const gridTexture = new Texture<HTMLCanvasElement>(gl, {image: textCanvas});// new CheckmateTexture(gl, {width: 1024, height: 1024, count: 4})

	let frameIndex = 0;

	function updateText () {
		frameIndex ++;

		textContext.clearRect(0, 0, textCanvas.width, textCanvas.height);

		textContext.strokeStyle = 'red';
		textContext.lineWidth = 10;
		textContext.strokeRect(0,0, textCanvas.width, textCanvas.height);

		textContext.font = '100px Arial';
		textContext.textAlign = 'center';
		textContext.fillText(
			"Frame: " + frameIndex.toFixed(0),
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

		planeLayer = renderer.createLayer<XRQuadLayer>('quad', {
			width: 2,
			height: 1,
			viewPixelHeight: gridTexture.image.height,
			viewPixelWidth: gridTexture.image.width
		});

		scene.addChild(planeLayer);

		// oculus has resynced frames, lol
		// and stop RAF from window before accept session
		renderer.requestAnimationFrame(update);


		renderer.xr.session.addEventListener('end', () => {
			setTimeout(()=>{
				// oculus has resynced frames, lol
				// and stop RAF from window before accept session
			renderer.requestAnimationFrame(update);
			});
		})
	});

	const scene = new Transform();

	scene.position.set(0, 1, -4);

	const sphereGeometry = new Sphere(gl);
	const cubeGeometry = new Box(gl);
	const cylinderGeometry = new Cylinder(gl);

	const sphere = new Mesh(gl, {
		geometry: sphereGeometry,
		program: new PrimitiveMaterial(gl, { uniforms: { uColor: {value: [1, 1, 0] } } }),
	});
	sphere.position.set(1.3, 0, 0);
	sphere.setParent(scene);

	const cube = new Mesh(gl, {
		geometry: cubeGeometry,
		program: new PrimitiveMaterial(gl, { uniforms: { uColor: {value: [1, 0, 0] } } }),
	});
	cube.position.set(0, -1.3, 0);
	cube.setParent(scene);

	const cylinder = new Mesh(gl, {
		geometry: cylinderGeometry,
		program: new PrimitiveMaterial(gl, { uniforms: { uColor: {value: [0, 0, 1]} } }),
	});
	cylinder.position.set(-1.3, 0, 0);
	cylinder.setParent(scene);

	renderer.requestAnimationFrame(update);
	/**
	 *
	 * @param {number} time
	 * @param {import('webxr').XRFrame} [frame]
	 */
	function update(time, frame = null) {
		renderer.requestAnimationFrame(update);

		updateText();

		if (planeLayer && frameIndex > 10) {
			planeLayer.rotation.y -= 0.02;

			planeLayer.referencedTexture = gridTexture;
			planeLayer.dirty = true;
		}

		sphere.rotation.y -= 0.03;
		cube.rotation.y -= 0.04;
		cylinder.rotation.y -= 0.02;

		renderer.gl.clearColor(1, 1, 1, 1);

		renderer.render({ scene, camera });
	}
}

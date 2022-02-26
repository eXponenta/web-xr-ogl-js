import {
	Camera,
	Transform,
	Program,
	Mesh,
	Plane,
	Sphere,
	Box,
	Cylinder,
} from "ogl";
import { PrimitiveMaterial } from "./primitives/PrimitiveMaterial";
import { QuadPrimitive } from "./primitives/QuadPrimitive";
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

	gl.clearColor(1, 1, 1, 1);

	const camera = new Camera(gl, { fov: 35 });
	camera.lookAt([0, 0, 0]);

	function resize() {
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
	}
	window.addEventListener("resize", resize, false);
	resize();

	requiestButton.addEventListener("click", async () => {
		await renderer.requestXR();

		renderer.xr.requestAnimatioFrame(resize);
		// oculus has resynced frames, lol
		// and stop RAF from window before accept session
		renderer.requestAnimatioFrame(update);
	});

	const scene = new Transform();

	scene.position.set(0, 1, -4);

	const sphereGeometry = new Sphere(gl);
	const cubeGeometry = new Box(gl);
	const cylinderGeometry = new Cylinder(gl);

	const program = new PrimitiveMaterial(gl);

	const plane = new QuadPrimitive(gl, {
		width: 2,
		height: 2,
		color: [1, 0, 1]
	});

	plane.position.set(0, 1.3, 0);
	plane.setParent(scene);

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

	renderer.requestAnimatioFrame(update);
	/**
	 *
	 * @param {number} time
	 * @param {import('webxr').XRFrame} [frame]
	 */
	function update(time, frame = null) {
		renderer.requestAnimatioFrame(update);

		plane.rotation.y -= 0.02;
		sphere.rotation.y -= 0.03;
		cube.rotation.y -= 0.04;
		cylinder.rotation.y -= 0.02;

		renderer.gl.clearColor(1, 1, 1, 1);

		renderer.render({ scene, camera });
	}
}

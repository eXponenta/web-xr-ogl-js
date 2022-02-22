import { Camera, Transform, Program, Mesh, Plane, Sphere, Box, Cylinder } from 'ogl';
import { XRRenderer } from './XRRenderer';

const vertex = /* glsl */ `
	attribute vec3 position;
	attribute vec3 normal;
	uniform mat4 modelViewMatrix;
	uniform mat4 projectionMatrix;
	uniform mat3 normalMatrix;
	varying vec3 vNormal;
	void main() {
		vNormal = normalize(normalMatrix * normal);
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const fragment = /* glsl */ `
	precision highp float;
	varying vec3 vNormal;
	void main() {
		vec3 normal = normalize(vNormal);
		float lighting = dot(normal, normalize(vec3(-0.3, 0.8, 0.6)));
		gl_FragColor.rgb = vec3(0.2, 0.8, 1.0) + lighting * 0.1;
		gl_FragColor.a = 1.0;
	}
`;

{
	const requiestButton = document.querySelector('#requiest-xr');
	const canvas = document.querySelector('#frame');
	const renderer = new XRRenderer({ dpr: 2, canvas, antialias : true, autoClear: true });

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
	window.addEventListener('resize', resize, false);
	resize();

	requiestButton.addEventListener('click', async () => {
		await renderer.requestXR();

		renderer.xr.requestAnimatioFrame(resize);
		// oculus has resynced frames, lol
		// and stop RAF from window before accept session
		renderer.requestAnimatioFrame(update);
	});


	const scene = new Transform();

	scene.position.set(0, 1, -4);

	const planeGeometry = new Plane(gl);
	const sphereGeometry = new Sphere(gl);
	const cubeGeometry = new Box(gl);
	const cylinderGeometry = new Cylinder(gl);

	const program = new Program(gl, {
		vertex,
		fragment,

		// Don't cull faces so that plane is double sided - default is gl.BACK
		cullFace: null,
	});

	const plane = new Mesh(gl, { geometry: planeGeometry, program });
	plane.position.set(0, 1.3, 0);
	plane.setParent(scene);

	const sphere = new Mesh(gl, { geometry: sphereGeometry, program });
	sphere.position.set(1.3, 0, 0);
	sphere.setParent(scene);

	const cube = new Mesh(gl, { geometry: cubeGeometry, program });
	cube.position.set(0, -1.3, 0);
	cube.setParent(scene);

	const cylinder = new Mesh(gl, { geometry: cylinderGeometry, program });
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

		renderer.gl.clearColor(1,1,1,1);

		renderer.render({ scene, camera });
	}
}

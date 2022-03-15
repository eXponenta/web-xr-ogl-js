import { createRef, useRef, useState } from "react";
import { useFrame, Canvas } from "react-ogl/web";
import { render } from "react-dom";
import { Mesh, Renderer } from "ogl";
import { XRRenderer } from "./xr/XRRenderer";
import { events } from "./utils/events";

const Box = (props) => {
	const mesh = useRef<Mesh>();
	const [hovered, setHover] = useState(false);
	const [active, setActive] = useState(false);

	return (
		<mesh
			{...props}
			ref={mesh}
			scale={active ? 1.5 : 1}
			onClick={() => setActive((value) => !value)}
			onPointerOver={() => setHover(true)}
			onPointerOut={() => setHover(false)}
		>
			<plane {...props} />
			<program
				vertex={`
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
        `}
				fragment={`
          precision highp float;

          uniform vec3 uColor;
          varying vec3 vNormal;

          void main() {
            vec3 normal = normalize(vNormal);
            float lighting = dot(normal, normalize(vec3(10)));

            gl_FragColor.rgb = uColor + lighting * 0.1;
            gl_FragColor.a = 1.0;
          }
        `}
				uniforms={{ uColor: hovered ? "hotpink" : "orange" }}
			/>
		</mesh>
	);
};

const ref = createRef<HTMLCanvasElement>();
render(
	<Canvas
		camera={{ position: [0, 1.6, 8] }}
		ref={ref}
		events = {events}
		renderer={() =>
			new XRRenderer({
				canvas: ref.current,
				dpr: 2,
				antialias: true,
				autoClear: true,
			})
		}
	>
		<transform position={[0, 1.6, 0]}>
			<Box key="grid" width={4} height={2} />

			<transform position={[-2, 0, 0]} rotation={[0, Math.PI / 6, 0]}>
				<Box
					key="left"
					position={[-0.5, 0, 0]}
					width={1}
					height={2}
				/>
			</transform>

			<transform position={[2, 0, 0]} rotation={[0, -Math.PI / 6, 0]}>
				<Box
					key="right"
					position={[0.5, 0, 0]}
					width={1}
					height={2}
				/>
			</transform>
		</transform>
	</Canvas>,
	document.getElementById("react-content")
);

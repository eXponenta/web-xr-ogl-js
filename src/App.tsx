import mergeRefs from "react-merge-refs";
import React, { useRef, useState } from "react";
import { useFrame, Canvas, useOGL } from "react-ogl/web";
import { XRRenderer } from "./xr/XRRenderer";
import { events } from "./utils/events";
import Layer3D from "./components/Layer3D";
import CanvasDebugFrame from "./components/CanvasDebugFrame";

const Scene = () => {
	const state = useOGL();

	useFrame(() => {
		(state.renderer as XRRenderer).gl.clearColor(1, 1, 1, 1);
	});

	return (
		<transform position={[0, 1.6, 0]}>
			<Layer3D label="grid" width={4} height={2}>
				<CanvasDebugFrame width={1024} height={512}  />
			</Layer3D>
			<Layer3D
				label="left"
				width={1}
				height={2}
				position={[-2, 0, 0]}
				anchor={[0.5, 0]}
				rotation={[0, Math.PI / 6, 0]}
			>
				<CanvasDebugFrame width={256} height={512} />
			</Layer3D>
			<Layer3D
				label="right"
				width={1}
				height={2}
				position={[2, 0, 0]}
				anchor={[-0.5, 0]}
				rotation={[0, -Math.PI / 6, 0]}
			>
				<CanvasDebugFrame width={256} height={512} />
			</Layer3D>
		</transform>
	);
};

export default React.forwardRef<HTMLCanvasElement, {}>(
	({ children }, forwardRef) => {
		const ref = useRef<HTMLCanvasElement>(null);

		return (
			<Canvas
				camera={{ position: [0, 1.6, 4] }}
				ref={mergeRefs([forwardRef, ref])}
				renderer={() =>
					new XRRenderer({
						canvas: ref,
						dpr: 2,
						antialias: true,
						autoClear: true,
					})
				}
			>
				<Scene />
			</Canvas>
		);
	}
);

import mergeRefs from "react-merge-refs";
import React, { useRef, useState } from "react";
import { useFrame, Canvas, useOGL } from "react-ogl/web";
import { XRRenderer } from "./xr/XRRenderer";
import { events } from "./utils/events";
import Layer3D from "./components/Layer3D";
import CanvasFrame from "./components/CanvasFrame";

const Scene = () => {
	const state = useOGL();

	useFrame(() => {
		(state.renderer as XRRenderer).gl.clearColor(1, 1, 1, 1);
	});

	return (
		<transform position={[0, 1.6, 0]}>
			<Layer3D key="grid" width={4} height={2}>
				<CanvasFrame width={1024} height={512}  />
			</Layer3D>
			<Layer3D
				key="left"
				width={1}
				height={2}
				position={[-2, 0, 0]}
				anchor={[0.5, 0]}
				rotation={[0, Math.PI / 6, 0]}
			>
				<CanvasFrame width={256} height={512} />
			</Layer3D>
			<Layer3D
				key="right"
				width={1}
				height={2}
				position={[2, 0, 0]}
				anchor={[-0.5, 0]}
				rotation={[0, -Math.PI / 6, 0]}
			>
				<CanvasFrame width={256} height={512} />
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

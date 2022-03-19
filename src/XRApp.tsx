import mergeRefs from "react-merge-refs";
import React, { useContext, useEffect, useRef } from "react";
import { useFrame, Canvas, useOGL, RootState } from "react-ogl/web";
import { XRRenderer } from "./xr/XRRenderer";
import Layer3D from "./components/Layer3D";
import CanvasDebugFrame from "./components/CanvasDebugFrame";
import { BaseAppContext } from "./BaseAppContext";
import { LinkWrap, Route } from "./components/Router";
import { mergeCallbacks } from "./utils/mergeCallback";

const Scene = ({ visible }: { visible?: boolean }) => {
	const state = useOGL();

	useFrame(() => {
		(state.renderer as any as XRRenderer).gl.clearColor(1, 1, 1, 1);
	});

	const baseAppContext = useContext(BaseAppContext);

	useEffect(() => {
		baseAppContext.xrState = state;
	}, []);

	return (
		<transform position={[0, 1.6, 0] as any} visible={visible}>
			<LinkWrap href="/">
				<Layer3D
					label="grid"
					width={0.2}
					height={0.1}
					position={[0, 2, 0]}
				>
					<CanvasDebugFrame width={100} height={50} />
				</Layer3D>
			</LinkWrap>

			<Layer3D label="grid" width={4} height={2}>
				<CanvasDebugFrame width={1024} height={512} />
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

export interface IXRAppProps {
	onCreated?: (state: RootState) => void;
	visible?: boolean;
}

const createRenderer = (canvas: HTMLCanvasElement) =>
	new XRRenderer({
		canvas,
		dpr: 2,
		antialias: true,
		autoClear: true,
	});

const createRendererContext = (state: RootState) => {
	const {
		renderer,
		subscribed,
		camera,
		scene
	} = state;

	const animate = (time?: number, frame?: any) => {
		state.animation = (renderer as any as XRRenderer).requestAnimationFrame(animate)

		// Call subscribed elements
		subscribed.forEach((ref: any) => ref.current?.(state, time))

		// Render to screen
		renderer.render({ scene, camera })
	}

	state.animation = (renderer as any as XRRenderer).requestAnimationFrame(animate);
};

export default React.forwardRef<HTMLCanvasElement, IXRAppProps>(function XRApp(
	{ onCreated, visible },
	forwardRef
) {
	const ref = useRef<HTMLCanvasElement>(null);

	return (
		<Canvas
			onCreated={mergeCallbacks([createRendererContext, onCreated])}
			camera={{ position: [0, 1.6, 4] }}
			ref={mergeRefs([forwardRef, ref])}
			renderer={createRenderer}
			frameloop='never'
		>
			<Scene visible={visible} />
		</Canvas>
	);
});

import mergeRefs from "react-merge-refs";
import React, { useRef } from "react";
import { Canvas, RootState } from "react-ogl/web";
import { XRRenderer } from "./xr/XRRenderer";

import { mergeCallbacks } from "./utils/mergeCallback";
import { Scene } from "./components/Scene";

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
			camera={{ position: [0, 1.6, 0], fov: 110 }}
			ref={mergeRefs([forwardRef, ref])}
			renderer={createRenderer}
			frameloop='never'
		>
			<Scene visible={visible} />
		</Canvas>
	);
});

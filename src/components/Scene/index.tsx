import { useContext, useEffect } from "react";
import { useFrame, useOGL } from "react-ogl";
import { BaseAppContext } from "../../BaseAppContext";
import { XRRenderer } from "../../xr/XRRenderer";
import CanvasDebugFrame from "../CanvasDebugFrame";
import Layer3D from "../Layer3D";
import { LinkWrap } from "../Router";

export const Scene = ({ visible }: { visible?: boolean }) => {
	const state = useOGL();

	useFrame(() => {
		(state.renderer as any as XRRenderer).gl.clearColor(1, 1, 1, 1);
	});

	const baseAppContext = useContext(BaseAppContext);

	useEffect(() => {
		baseAppContext.xrState = state as any;
	}, []);

	return (
		<transform position={[0, 1.6, -2] as any} visible={visible}>
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

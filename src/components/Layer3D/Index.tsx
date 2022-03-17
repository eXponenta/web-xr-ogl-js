import { Mesh, Program, Transform } from "ogl";
import { useEffect, useRef, useState } from "react";
import { IEventPair } from "react-ogl";
import BaseProgram from "../BaseProgram";
import { createMappedEvent, EventContextForwarder } from "../EventContext";

export default function Layer3D({
	anchor = [0, 0],
	width = 1,
	height = 1,
	position = [0, 0, 0],
	rotation = [0, 0, 0],
	pixelWidth = width * 100,
	pixelHeight = height * 100,
	children,
	...props
}) {
	const eventTarget = new EventTarget();

	const transformRef = useRef<Transform>();
	const meshRef = useRef<Mesh>();
	const [hovered, setHover] = useState(false);

	const programRef = useRef<Program>();

	const reDespath = (e: IEventPair<PointerEvent>) => {
		eventTarget.dispatchEvent(createMappedEvent(e, { width: pixelWidth, height: pixelHeight }));
	}

	const handleMove = (e: IEventPair<PointerEvent>) => {
		(
			programRef.current.uniforms as Record<string, { value: any }>
		).uPoint.value = e.hit?.uv || [0, 0];

		reDespath(e)
	};

	const handleOver = (e: IEventPair<PointerEvent>) => {
		setHover(true);

		reDespath(e);
	};

	const handleOut = (e: IEventPair<PointerEvent>) => {
		setHover(false);

		reDespath(e);
	};


	return (
		<transform rotation={rotation} position={position} ref={transformRef}>
			<mesh
				position={[-width * anchor[0], -height * anchor[1], 0]}
				onPointerOver={handleOver}
				onPointerOut={handleOut}
				onPointerMove={handleMove}
				ref={meshRef}
			>
				<EventContextForwarder.Provider value={eventTarget}>
					<plane width={width} height={height} />
					<BaseProgram
						ref={programRef}
						color={hovered ? "hotpink" : "green"}
						mousePoint={[0, 0]}
					>
						{children}
					</BaseProgram>
				</EventContextForwarder.Provider>
			</mesh>
		</transform>
	);
}

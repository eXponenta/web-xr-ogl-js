import { Mesh, Program, Transform } from "ogl";
import { useEffect, useRef, useState } from "react";
import BaseProgram from "../BaseProgram";
import { EventContextForwarder } from "../EventContext";

export default function Layer3D({
	anchor = [0, 0],
	width = 1,
	height = 1,
	position = [0, 0, 0],
	rotation = [0, 0, 0],
	children,
	...props
}) {
	const eventTarget = new EventTarget();

	const transformRef = useRef<Transform>();
	const meshRef = useRef<Mesh>();
	const [hovered, setHover] = useState(false);

	const programRef = useRef<Program>();

	const reDespath = (e: Event & {hit: any}) => {
		const newEvent = new (e.constructor as any)(e.type, e);
		newEvent.hit = e.hit;

		eventTarget.dispatchEvent(newEvent);
	}

	const handleMove = (e: PointerEvent & {hit: any}) => {
		(
			programRef.current.uniforms as Record<string, { value: any }>
		).uPoint.value = e.hit?.uv || [0, 0];

		reDespath(e)
	};

	const handleOver = (e: PointerEvent & {hit: any}) => {
		setHover(true);

		reDespath(e);
	};

	const handleOut = (e: PointerEvent & {hit: any}) => {
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

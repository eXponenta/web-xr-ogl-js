import { Mesh, Program, Transform, Vec3 } from "ogl";
import React, { useEffect, useRef, useState } from "react";
import { IEventPair, Vec3Props, EventHandlers } from "react-ogl";
import BaseProgram from "../BaseProgram";
import { createMappedEvent, EventContextForwarder, IHitRegion } from "../EventContext";

const mergeEvents = (handlers: Array<(e: any) => void> ) => {
	return (e: any) => {
		handlers.forEach((h) => h && h(e));
	}
}


export interface ILayer3DProp {
	label?: string;
	anchor?: Array<number>;
	width?: number;
	height?: number;
	position?: Array<Number> | Vec3 | Vec3Props;
	rotation?: Array<Number> | Vec3 | Vec3Props;
	pixelWidth?: number;
	pixelHeight?: number;
	children: React.ReactElement<IHitRegion & Record<string, any>, 'texture'>;
}

export default function Layer3D({
	label = '',
	anchor = [0, 0],
	width = 1,
	height = 1,
	position = [0, 0, 0],
	rotation = [0, 0, 0],
	pixelWidth = width * 100,
	pixelHeight = height * 100,

	onPointerDown,
	onPointerUp,
	onPointerMove,
	onPointerOut,
	onPointerOver,
	onClick,

	children,
}: ILayer3DProp & EventHandlers) {

	const [hitRegion] = useState<IHitRegion>( { width: pixelWidth, height: pixelHeight });
	const [eventTarget] = useState<EventTarget>(new EventTarget());

	const [hovered, setHover] = useState(false);

	const transformRef = useRef<Transform>();

	const meshRef = useRef<Mesh>();

	const programRef = useRef<Program>();

	useEffect(()=>{
		// read a width and height prop from frame
		React.Children.forEach(children, (child) => {
			if ( typeof child.props.height === 'number') {
				hitRegion.width = child.props.width;
				hitRegion.height = child.props.height;

				console.debug(`[Layer3D: ${label}] pixelSize changed to ${hitRegion.width}x${hitRegion.height}`);
			}
		});
	}, [pixelWidth, pixelWidth, children])


	const reDespath = (e: IEventPair<PointerEvent>, overrides?: any) => {
		eventTarget.dispatchEvent(createMappedEvent(e, hitRegion, overrides));
	}

	const handleMove = (e: IEventPair<PointerEvent>) => {
		(
			programRef.current.uniforms as Record<string, { value: any }>
		).uPoint.value = e.hit?.uv || [0, 0];

		reDespath(e)
	};

	const handleOver = (e: IEventPair<PointerEvent>) => {

		setHover(true);

		// fiber event fire 'pointermove', change it
		reDespath(e, {type: 'pointerover' });
	};

	const handleOut = (e: IEventPair<PointerEvent>) => {

		setHover(false);

		// fiber event fire 'pointermove', change it
		reDespath(e, {type: 'pointerout'});
	};

	return (
		<transform rotation={rotation as any} position={position as any} ref={transformRef}>
			<mesh
				position={[-width * anchor[0], -height * anchor[1], 0]}
				onPointerOver={mergeEvents([handleOver, onPointerOver])}
				onPointerOut={mergeEvents([handleOut, onPointerOut])}
				onPointerMove={mergeEvents([handleMove, onPointerMove])}
				onPointerDown={mergeEvents([reDespath, onPointerDown])}
				onPointerUp={onPointerUp}
				onClick={onClick}

				ref={meshRef}
			>
				<EventContextForwarder.Provider value={eventTarget}>
					<plane {...{width, height} as any} />
					<BaseProgram
						ref={programRef}
						color={hovered ? "hotpink" : "green"}
						mousePoint={[0, 0]}
					>
						{[children]}
					</BaseProgram>
				</EventContextForwarder.Provider>
			</mesh>
		</transform>
	);
}

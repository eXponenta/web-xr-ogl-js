import { Mesh, Program, Transform } from "ogl";
import { useEffect, useRef, useState } from "react";
import BaseProgram from "../BaseProgram";

export default ({
	anchor = [0, 0],
	width = 1,
	height = 1,
	position = [0, 0, 0],
	rotation = [0, 0, 0],
	children,
	...props
}) => {
	const transformRef = useRef<Transform>();
	const meshRef = useRef<Mesh>();
	const [hovered, setHover] = useState(false);

	const programRef = useRef<Program>();

	const handleMove = ({ hit }: any) => {
		(
			programRef.current.uniforms as Record<string, { value: any }>
		).uPoint.value = hit?.uv || [0, 0];
	};

	useEffect(() => {
		console.log(programRef);
	});

	return (
		<transform rotation={rotation} position={position} ref={transformRef}>
			<mesh
				position={[-width * anchor[0], -height * anchor[1], 0]}
				onPointerOver={() => setHover(true)}
				onPointerOut={() => setHover(false)}
				onPointerMove={handleMove}
				ref={meshRef}
			>
				<plane width={width} height={height} />
				<BaseProgram
					ref={programRef}
					color={hovered ? "hotpink" : "green"}
					mousePoint={[0, 0]}
				>
					{children}
				</BaseProgram>
			</mesh>
		</transform>
	);
};

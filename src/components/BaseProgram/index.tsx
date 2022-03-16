import { Program } from "ogl";
import { extend, Node } from "react-ogl";

import React from "react";

const FRAG = `
precision highp float;

uniform vec3 uColor;
uniform vec2 uPoint;
uniform sampler2D uSampler0;
uniform vec2 uSampler0Size;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
	gl_FragColor = texture2D(uSampler0, vUv);

	vec2 dist = (uPoint - vUv);
	dist.x *= uSampler0Size.x / uSampler0Size.y;

	float marker = 0.0;

	marker = max(step(length(dist), 0.01), marker);

	marker = max(marker, step(abs(dist.x), 0.002));
	marker = max(marker, step(abs(dist.y), 0.002));

	gl_FragColor = mix (gl_FragColor, vec4(1.0, 0., 0., 1.), marker);
}
`;

const VERT = `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
	vNormal = normalize(normalMatrix * normal);
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export interface IProgProps {
	mousePoint?: Array<number>;
	color?: string | any;
	children: any[];
}

export class BaseProgramWithTexture extends Program {
	constructor(gl: GLContext) {
		super(gl, {
			vertex: VERT,
			fragment: FRAG,
			transparent: true,
			uniforms:{
				uColor: { value: [1,1,1] },
				uPoint: { value: [0,0] },
				uSampler0: { value: null },
				uSampler0Size: {value: [1,1]}
			}
		});
	}

	set texture(v) {
		this.uniforms.uSampler0 = { value: v };
		this.uniforms.uSampler0Size = {value: v.image ? [v.image.width, v.image.height] : [1,1]}
	}

	get texture() {
		return this.uniforms.uSampler0?.value;
	}
}

extend({BaseProgramWithTexture});

declare global {
	namespace JSX {
	  interface IntrinsicElements {
		baseProgramWithTexture: Node<BaseProgramWithTexture, typeof BaseProgramWithTexture>
	  }
	}
  }


export default React.forwardRef<Program, IProgProps>(
	({ color = "pink", mousePoint = [0, 0], children }, ref) => {
		return (
			<baseProgramWithTexture
				ref={ref}
			>
				{children}
			</baseProgramWithTexture>
		);
	}
);

import { Program } from "ogl";
import { extend, Node } from "react-ogl";

import React from "react";

const FRAG = `
precision highp float;

uniform vec3 uColor;
uniform vec2 uPoint;
uniform sampler2D uSampler0;

varying vec3 vNormal;
varying vec2 vUv;

void main() {
	gl_FragColor.rgba = texture2D(uSampler0, vUv);
	gl_FragColor.rgb = mix (vec3(0.0), gl_FragColor.rgb, step(0.01, length(uPoint - vUv)));
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
			}
		});
	}

	set texture(v) {
		this.uniforms.uSampler0.value = v;
	}

	get texture() {
		return this.uniforms.uSampler0.value;
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

import { Geometry, GLTFAsset, Mesh, Program, Texture, Transform } from 'ogl';
import GLTFShader from './GLTFShader';

export type IGLTFNode = Mesh<Geometry, Program & { gltfMaterial: any }> & {
	boneTexture: Texture<Float32Array>;
};

export interface IShaderBuilder {
	createProgram(gl: GLContext, node: IGLTFNode): Program;
}

export function spawn(gl: GLContext, gltf: GLTFAsset, shaderBuilder?: IShaderBuilder): Transform {
	const baseRoot = new Transform();
	const s = gltf.scene || gltf.scenes[0];

	shaderBuilder = shaderBuilder || GLTFShader;

	s.forEach((root) => {
		root.setParent(baseRoot);
		root.traverse((node: any) => {
			if (node.program) {
				node.program = shaderBuilder.createProgram(gl, node);
			}
		});
	});

	// Calculate world matrices for bounds
	baseRoot.updateMatrixWorld();

	return baseRoot;
}

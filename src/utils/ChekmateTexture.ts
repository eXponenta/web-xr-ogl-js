import { Texture } from "ogl";

export function generateCheckmate (width = 256, height = 256, step = 64, count = null) {
	const grid = document.createElement('canvas');
	grid.width = width;
	grid.height = height;

	const gridCtx = grid.getContext('2d');

	gridCtx.fillStyle = 'black';

	const countX = count || width / step | 0;
	const countY = count || height / step | 0;

	const sx = width / countX | 0;
	const sy = height / countY | 0;

	for(let i = 0; i < countY * countX; i+=2) {
		const yi = (i / countX | 0);
		const xi = (i % countX + yi % 2);

		gridCtx.fillRect(
			xi * sx, yi * sy, sx, sy
		);
	}

	gridCtx.lineWidth = 4;
	gridCtx.strokeStyle = 'red';
	gridCtx.setLineDash([5, 15]);
	gridCtx.strokeRect(0, 0, width, height);
	gridCtx.fill();

	return grid;
}

export class CheckmateTexture extends Texture <HTMLCanvasElement> {
	constructor (context: GLContext, { width = 256, height = 256, count = 4 }: { width?: number, height?: number, count?: number } = {}) {
		super(
			context, {
				image: generateCheckmate( width, height, count )
			}
		)
	}
}

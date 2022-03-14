import { Texture } from "ogl";

function generateCheckmate (width = 256, height = 256, count = 4) {
	const grid = document.createElement('canvas');
	grid.width = width;
	grid.height = height;

	const gridCtx = grid.getContext('2d');

	gridCtx.fillStyle = 'black';

	const sx = width / count | 0;
	const sy = height / count | 0;

	for(let i = 0; i < count * count; i+=2) {
		const yi = (i / count | 0);
		const xi = (i % count + yi % 2);

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

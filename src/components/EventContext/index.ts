import React from "react";
import { IEventPair, IHitResult } from "react-ogl";

export const EventContextForwarder = React.createContext<EventTarget>(null);

export interface IHitRegion {
	width: number;
	height: number;
}

/**
 * Create syntetic event from pair realtive hit region
 */
export function createMappedEvent(
	{ event, hit }: IEventPair<PointerEvent>,
	region: IHitRegion,
	overrides?: PointerEventInit & {type?: string}
) {
	if (!hit?.uv) {
		throw new Error(
			"Event pair should contain valid UV location for evaluate local size"
		);
	}

	const { uv: localPos } = hit;

	const dict: PointerEventInit & { type?: string} = {};

	for (const key in event) {
		// skip functions
		if (typeof key === "function") {
			continue;
		}

		// clone values
		dict[key] = overrides?.[key] || event[key];
	}


	// overwrite event
	dict.clientX = localPos[0] * region.width;
	dict.clientY = (1 - localPos[1]) * region.height;
	dict.screenX = dict.clientX;
	dict.screenY = dict.clientY;

	const Ctor: typeof PointerEvent = event.constructor as typeof PointerEvent;

	// clone with new props
	const newEvent = new Ctor(dict.type, dict) as PointerEvent & {
		original: PointerEvent;
		hit: IHitResult;
		hitRegion: IHitRegion;
	};

	newEvent.original = event;
	newEvent.hit = hit;
	newEvent.hitRegion = region;

	return newEvent;
}

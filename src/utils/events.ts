import * as OGL from 'ogl'
import { Instance, RootState, EventHandlers } from 'react-ogl/types'
import { EventManager } from "react-ogl/types";

/**
 * Creates event handlers, returning an event handler method.
 */
export const createEvents = (state: RootState) => {
	const handleEvent = (event: PointerEvent, type: keyof EventHandlers) => {
		// Convert mouse coordinates
		state.mouse.x = (event.offsetX / state.renderer.width) * 2 - 1;
		state.mouse.y = -(event.offsetY / state.renderer.height) * 2 + 1;

		// Get elements that intersect with our pointer
		state.raycaster.castMouse(state.camera, state.mouse);

		const meshes: Array<OGL.Mesh> = [];
		state.scene.traverse((child: any) => {
			if (child?.geometry?.attributes?.position) {
				meshes.push(child as OGL.Mesh);
			}
		});

		const intersects: Array<Instance & { hit: any }> = state.raycaster.intersectMeshes(meshes, {includeNormal: false});

		// Used to discern between generic events and custom hover events.
		// We hijack the pointermove event to handle hover state
		const isHoverEvent = type === "onPointerMove";

		// Trigger events for hovered elements
		intersects.forEach((object) => {

			const handlers = object.__handlers;

			// Bail if object doesn't have handlers (managed externally)
			if (!handlers) return;

			if (isHoverEvent && !state.hovered.get(object.id)) {
				// Mark object as hovered and fire its hover events
				state.hovered.set(object.id, object);

				// Fire hover events
				handlers.onPointerMove?.({event, hit: object.hit});
				handlers.onPointerOver?.({event, hit: object.hit});
			} else {
				// Otherwise, fire its generic event
				handlers[type]?.({event, hit: object.hit});
			}
		});

		// Cleanup stale hover events
		if (isHoverEvent || type === "onPointerDown") {
			state.hovered.forEach((object: Instance) => {
				const handlers = object.__handlers;

				if (
					!intersects.length ||
					!intersects.find((i) => i === object)
				) {
					// Reset hover state
					state.hovered.delete(object.id);

					// Fire unhover event
					if (handlers?.onPointerOut) handlers.onPointerOut({event, hit: object.hit});
				}
			});
		}

		return intersects;
	};

	return { handleEvent };
};
/**
 * Base DOM events and their JSX keys with passive args.
 */
export const EVENTS = {
	click: ["onClick", false],
	pointerup: ["onPointerUp", true],
	pointerdown: ["onPointerDown", true],
	pointermove: ["onPointerMove", true],
} as const;

/**
 * DOM OGL events manager.
 */
export const events: EventManager = {
	connected: false,
	/**
	 * Creates and registers event listeners on our canvas.
	 */
	connect(canvas, state) {
		// Cleanup old handlers
		state.events?.disconnect?.(canvas, state);

		// Get event handler
		const { handleEvent } = createEvents(state);

		// Create handlers
		state.events.handlers = Object.entries(EVENTS).reduce(
			(
				acc,
				[name, [type]]: [
					keyof typeof EVENTS,
					typeof EVENTS[keyof typeof EVENTS]
				]
			) => ({
				...acc,
				[name]: (event: PointerEvent) => handleEvent(event, type),
			}),
			{}
		);

		// Register handlers
		Object.entries(state.events.handlers ?? []).forEach(
			([name, handler]) => {
				const [, passive] = EVENTS[name];
				canvas.addEventListener(name, handler as any, { passive });
			}
		);

		// Mark events as connected
		state.events.connected = true;
	},
	/**
	 * Deletes and disconnects event listeners from canvas.
	 */
	disconnect(canvas, state) {
		// Disconnect handlers
		Object.entries(state.events?.handlers ?? []).forEach(
			([name, handler]) => {
				canvas.removeEventListener(name, handler as any);
			}
		);

		// Mark events as disconnected
		state.events.connected = false;
	},
};

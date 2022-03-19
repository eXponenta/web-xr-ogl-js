import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { IEventPair } from "react-ogl";
import { pushRoute } from "./Route";

export interface ILinkParams {
	/**
	 * Link navigate to, same as a.href or Link.href from router
	 */
	href: string;
	/**
	 * Which event will produce navigation 'pointerup' or 'pointerdown'
	 */
	triggerEvent?: "onPointeUp" | "onPointerDown";
	/**
	 * Delay between event and routing
	 */
	delay?: number;
}

interface IEventHandlerComponent {
	onPointerUp?: (...args: any[]) => void;
	onPointerDown?: (...args: any[]) => void;
	children: React.ReactChild;
}

declare global {
	namespace JSX {
		interface IntrinsicElements {
			linkTargetComponent: IEventHandlerComponent;
		}
	}
}

export const asLink = (linkTargetComponent: IEventHandlerComponent) => {
	return ({
		children,
		href,
		triggerEvent = "onPointerDown",
		delay = 0, 
		...props
	}: IEventHandlerComponent & ILinkParams) => {
		const [executed, setExecute] = useState(false);

		const executeRoute = () => {
			console.log("Begin route to", href);

			setExecute(true);

			setTimeout(() => {
				console.log("End route to", href);
				pushRoute(href);
				setExecute(false);
			}, delay | 0);
		};

		const execute = useCallback(
			(e: IEventPair<PointerEvent> | PointerEvent) => {

				const event = e instanceof Event ? e : e.event;
				if (event.preventDefault) event.preventDefault();

				if (props[triggerEvent]) {
					props[triggerEvent](e);
				}

				if (!executed) executeRoute();
			},
			[triggerEvent]
		);

		return (
			<linkTargetComponent
				{...props}

				{...{
					[triggerEvent]: execute
				}}

			>
				{children}
			</linkTargetComponent>
		);
	};
};

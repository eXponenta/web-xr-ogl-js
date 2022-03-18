import React, { ReactElement, useCallback, useEffect, useState } from "react";

export interface ILinkParams {
	/**
	 * Link navigate to, same as a.href or Link.href from router
	 */
	href: string;
	/**
	 * Which event will produce navigation 'pointerup' or 'pointerdown'
	 */
	mode?: "up" | "down";
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

export const asLink = (
	linkTargetComponent: ReactElement<IEventHandlerComponent>,
	{ href, mode = "down", delay = 0 }: ILinkParams
) => {
	return ({
		onPointerUp,
		onPointerDown,
		children,
		...props
	}: IEventHandlerComponent) => {
		const [executed, setExecute] = useState(false);

		const executeRoute = () => {
			console.log("Route to", href);

			setExecute(true);
		};

		const executeDown = useCallback(
			(e: any) => {
				onPointerDown && onPointerDown(e);

				if (mode === "down" && !executed) executeRoute();
			},
			[onPointerDown]
		);

		const executeUp = useCallback(
			(e: any) => {
				onPointerUp && onPointerUp(e);

				if (mode === "up" && !executed) executeRoute();
			},
			[onPointerUp]
		);

		useEffect(() => {
			if (executed) {
				setTimeout(() => {}, delay | 0);
			}
		}, [executed]);

		return (
			<linkTargetComponent
				{...props}
				onPointerUp={executeUp}
				onPointerDown={executeDown}
			>
				{children}
			</linkTargetComponent>
		);
	};
};

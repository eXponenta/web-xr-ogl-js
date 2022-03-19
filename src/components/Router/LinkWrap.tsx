import React, {
	PropsWithChildren,
	ReactElement,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
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

	preventDefault?: boolean;
}

interface IEventHandlerComponent {
	onPointerUp?: (...args: any[]) => void;
	onPointerDown?: (...args: any[]) => void;
}

export const LinkWrap = ({
	children,
	href,
	triggerEvent = "onPointerDown",
	delay = 0,
	preventDefault = false,
}: PropsWithChildren<ILinkParams>) => {
	const [executed, setExecute] = useState(false);

	const executeRoute = () => {
		console.debug("Begin route to", href);

		setExecute(true);
	};

	const execute = useCallback(
		(e: IEventPair<PointerEvent> | PointerEvent) => {
			const event = "event" in e ? e.event : e;

			if (event.preventDefault && preventDefault) event.preventDefault();

			if (!executed) executeRoute();
		},
		[triggerEvent, children]
	);

	useEffect(() => {
		if (!executed) {
			return;
		}

		const t = setTimeout(() => {
			console.debug("End route to", href);

			setExecute(false);
			pushRoute(href);

		}, delay | 0);

		return () => clearTimeout(t);
	}, [executed]);

	const compileChild = useMemo(
		() =>
			React.Children.map(children, (child) => {
				if (!React.isValidElement(child)) {
					return null;
				}

				return React.cloneElement(child, {
					[triggerEvent]: (e) => {
						execute(e);
						if (child.props[triggerEvent]) {
							child.props[triggerEvent](e);
						}
					},
				});
			}),
		[children]
	);

	return <>{compileChild}</>;
};

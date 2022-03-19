import {
	Children,
	cloneElement,
	ReactElement,
	useState,
	useEffect,
} from "react";

export interface IRouteProps {
	path: string;
	mode?: "visible" | "unmount";
	children?: any;
}

export const stripPath = (path: string) => path ? path.replace(/^\/|\/$/g, ''): path;

export const STRATEGY = "hash";

export const getCurrentUrl = () =>
	STRATEGY == "hash"
		? window.location.hash.replace("#", "")
		: window.location.pathname;

export const pushRoute = (target: string = "/", force = false) => {
	target = stripPath(target)

	if (getCurrentUrl() === target && !force) {
		return;
	}

	if (STRATEGY == 'hash') {
		window.location.hash = target;
		window.dispatchEvent(new PopStateEvent("popstate"));
	} else {
		window.history.pushState({}, "", target);
		window.dispatchEvent(new PopStateEvent("popstate"));
	}
};

export const Route = ({ path, mode = "unmount", children }: IRouteProps) => {
	const [currentPath, setCurrentPath] = useState(getCurrentUrl());

	useEffect(() => {
		const locationChange = () => {
			setCurrentPath(getCurrentUrl());
		};

		window.addEventListener("popstate", locationChange);

		return () => window.removeEventListener("popstate", locationChange);
	}, []);

	const needRender = stripPath(path) === stripPath(currentPath);

	if (mode === "unmount") {
		return needRender ? children : null;
	}

	return Children.map(children, (child) => {
		if (typeof child !== "object" || !child) {
			return needRender ? child : null;
		}

		return cloneElement(child, {
			visible:
				child.props.visible != null
					? child.props.visible && needRender
					: needRender,
		});
	});
};

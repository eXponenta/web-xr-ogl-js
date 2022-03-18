import {
	Children,
	PropsWithChildren,
	cloneElement,
	ReactElement,
	useState,
	useEffect,
} from "react";

export interface IRouteProps {
	path: string;
	mode?: "visible" | "unmount";
	children?: ReactElement;
}

export const useRouter = () => window.location.pathname;

export const pushRoute = (target: string = "/", force = false) => {
	if (window.location.pathname === target && !force) {
		return;
	}

	window.history.pushState({}, "", target);
	window.dispatchEvent(new PopStateEvent("popstate"));
};

export const Route = ({ path, mode = "unmount", children }: IRouteProps) => {
	const [currentPath, setCurrentPath] = useState(useRouter());

	useEffect(() => {
		const locationChange = () => {
			setCurrentPath(window.location.pathname);
		};

		window.addEventListener("popstate", locationChange);

		return () => window.removeEventListener("popstate", locationChange);
	}, []);

	const needRender = path === currentPath;

	if (mode === "unmount") {
		return needRender ? { children } : void 0;
	}

	return Children.map(children, (child) => {
		if (typeof child !== "object" || !child) {
			return needRender ? child : void 0;
		}

		return cloneElement(child, {
			visible:
				child.props.visible != null
					? child.props.visible && needRender
					: needRender,
		});
	});
};

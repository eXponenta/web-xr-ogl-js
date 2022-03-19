import { StrictMode, useRef, useState } from "react";
import { render } from "react-dom";
import { BaseAppContext } from "./BaseAppContext";

import Overlay from "./App";
import XRApp from "./XRApp";
import { Route } from "./components/Router";

function BaseApp() {
	const htmlRef = useRef<HTMLDivElement>();
	const [xrState, setXRState] = useState(null);

	return (
		<BaseAppContext.Provider
			value={{ overlayRoot: htmlRef.current, xrState }}
		>
			<Route path="/xr">
				<XRApp onCreated={setXRState} />
			</Route>
			<Route path="/">
				<Overlay ref={htmlRef} />
			</Route>
		</BaseAppContext.Provider>
	);
}

render(
	<StrictMode>
		<BaseApp />
	</StrictMode>,
	document.getElementById("react-content")
);

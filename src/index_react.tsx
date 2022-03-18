import { StrictMode, useRef, useState } from "react";
import { render } from "react-dom";
import { BaseAppContext } from "./BaseAppContext";

import Overlay from "./App";
import XRApp from "./XRApp";

function BaseApp() {
	const htmlRef = useRef<HTMLDivElement>();
	const [xrState, setXRState] = useState(null);

	return (
		<BaseAppContext.Provider
			value={{ overlayRoot: htmlRef.current, xrState }}
		>
			<XRApp onCreated={setXRState} />
			<Overlay ref={htmlRef} />
		</BaseAppContext.Provider>
	);
}

render(
	<StrictMode>
		<BaseApp />
	</StrictMode>,
	document.getElementById("react-content")
);

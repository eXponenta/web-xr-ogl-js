import { forwardRef, HTMLProps, useContext, useEffect } from "react";
import { BaseAppContext } from "./BaseAppContext";
import { LinkWrap } from "./components/Router";

export default forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(function HtmlApp(_, ref) {
	const context = useContext(BaseAppContext);

	useEffect(()=> {
		console.log(context);
	}, [context.xrState]);

	return (
		<div
			ref={ref}
			style={{
				width: "100%",
				height: "100%",
				position: "absolute",
				top: "0",
				left: "0",
				pointerEvents: 'none', // disable events blocking for root
				userSelect: 'none'
			}}
		>
			<LinkWrap href="/xr">
				<button style={{pointerEvents: 'auto'}}>Test</button>
			</LinkWrap>
		</div>
	);
});

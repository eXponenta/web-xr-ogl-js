import { createContext } from "react";
import { RootState } from "react-ogl";
import { XRRenderer } from "./xr/XRRenderer";

export interface IBaseAppContext {
	overlayRoot: HTMLElement;
	xrState: Omit<RootState, 'renderer'> & { renderer: XRRenderer };
}

export const BaseAppContext = createContext<IBaseAppContext>({
	overlayRoot: null,
	xrState: null,
})

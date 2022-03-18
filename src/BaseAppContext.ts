import { createContext } from "react";
import { RootState } from "react-ogl";

export interface IBaseAppContext {
	overlayRoot: HTMLElement;
	xrState?: RootState;
}

export const BaseAppContext = createContext<IBaseAppContext>({overlayRoot: null})

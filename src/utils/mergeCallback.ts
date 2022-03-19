export const mergeCallbacks = <T>(funcs: Array<(e: T) => void>) => {
	return (args: T) => funcs.forEach((c) => c && c(args));
}

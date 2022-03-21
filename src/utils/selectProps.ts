export const selectProps = <T = any>(obj: object, known: Array<string>) => {
	return known.reduce((acc, key) => (key in obj) ? (acc[key] = obj[key], acc) : acc, {}) as T;
}

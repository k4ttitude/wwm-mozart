import { KEY_MAP } from "./consts.mjs";

export const noteToKeyPress = (note) => {
	const press = KEY_MAP[note];
	if (!press) return null;

	const [key, modifier] = press.toLowerCase().split("-");
	return { key, modifier };
};

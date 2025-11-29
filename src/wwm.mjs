import { KEY_MAP } from "./consts.mjs";

export const noteToKeyPress = (note) => {
	const keyPress = KEY_MAP[note];

	if (!keyPress) return null;

	const [key, modifier] = keyPress.toLowerCase().split("-");
	return { key, modifier };
};

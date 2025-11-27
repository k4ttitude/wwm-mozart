export const getKeyPress = (value) => {
	const [key, modifier] = value.toLowerCase().split("-");
	return { key, modifier };
};

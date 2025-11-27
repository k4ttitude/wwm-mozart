import robot from "@jitsi/robotjs";
import { sleep } from "./utils.mjs";

const track = JSON.parse(process.argv[2]);

const play = async () => {
	for (const note of track) {
		const { deltaTime, key, modifier } = note;
		deltaTime && (await sleep(deltaTime));
		modifier ? robot.keyTap(key, modifier) : robot.keyTap(key);
	}
};

play();

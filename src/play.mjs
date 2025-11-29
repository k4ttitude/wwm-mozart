import robot from "@jitsi/robotjs";
import { midiToKeys } from "./midi.mjs";

const sleep = (duration) =>
	new Promise((resolve) => setTimeout(resolve, duration));

const main = async () => {
	const filename = process.argv[2];
	console.log(`Playing: ${filename}`);
	if (!filename) {
		console.error("Usage: node play.mjs <midi-file>");
		process.exit(1);
	}

	const args = process.argv.slice(2);
	const midiFile = args[0];
	const dryRun = args.includes("-n");
	const showTiming = args.includes("--timing");
	let trackIndex = null;

	// Parse arguments
	args.slice(1).forEach((arg) => {
		if (/^\d+$/.test(arg)) {
			trackIndex = parseInt(arg, 10);
		}
	});

	try {
		const notes = await midiToKeys(midiFile, {
			trackIndex,
			showTiming,
		});

		if (!dryRun) {
			console.log("Playing in 3 seconds...");
			await sleep(3000);
			for (const note of notes) {
				const { key, modifier, deltaTime } = note;
				deltaTime && (await sleep(deltaTime));
				if (key) {
					modifier ? robot.keyTap(key, modifier) : robot.keyTap(key);
				}
			}
		}
	} catch (error) {
		if (error.code === "ENOENT") {
			console.error(`Error: File '${midiFile}' not found!`);
		} else {
			console.error(`Error: ${error.message}`);
		}
		process.exit(1);
	}
};

main();

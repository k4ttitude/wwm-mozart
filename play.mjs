import midiParser from "midi-parser-js";
import { readFile } from "fs/promises";
import robot from "@jitsi/robotjs";

const KEY_MAP = {
	48: "Z",
	50: "X",
	52: "C",
	53: "V",
	55: "B",
	57: "N",
	59: "M",

	60: "A",
	62: "S",
	64: "D",
	65: "F",
	67: "G",
	69: "H",
	71: "J",

	72: "Q",
	74: "W",
	76: "E",
	77: "R",
	79: "T",
	81: "Y",
	83: "U",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
	const filename = process.argv[2];
	if (!filename) {
		console.error("Usage: node play.mjs <midi-file>");
		process.exit(1);
	}
	const fileContent = await readFile(filename, "base64");
	var midiArray = midiParser.parse(fileContent);
	const outliners = [];

	const trackNameEvent = midiArray.track[0].event.find(
		(e) => e.type === 255 && e.metaType === 3,
	);
	const trackName = trackNameEvent ? trackNameEvent.data : "Unnamed Track";

	// Get tempo (microseconds per quarter note, default 500000 = 120 BPM)
	const tempoEvent = midiArray.track[0].event.find((e) => e.type === 81);
	const microsecondsPerBeat = tempoEvent ? tempoEvent.data : 500000;
	const ticksPerBeat = midiArray.timeDivision;
	const microsecondsPerTick = microsecondsPerBeat / ticksPerBeat;

	console.log(`Track name: ${trackName}`);
	console.log(`Tempo: ${60000000 / microsecondsPerBeat} BPM`);
	console.log(`Ticks per beat: ${ticksPerBeat}`);
	console.log(`Starting in 3 seconds...`);
	await sleep(3000);

	for (const event of midiArray.track[0].event) {
		if (event.deltaTime > 0) {
			const delayMs = (event.deltaTime * microsecondsPerTick) / 1000;
			await sleep(delayMs);
		}

		if (event.type !== 9) continue;

		const noteNumber = event.data[0];
		const key = KEY_MAP[noteNumber];
		if (!key) {
			outliners.push(noteNumber);
		} else {
			robot.keyTap(key.toLowerCase());
			console.log(key);
		}
	}

	console.log("Done!");
	console.log("Unmapped notes:", outliners.join(" "));
};

main();

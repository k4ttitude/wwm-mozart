import midiParser from "midi-parser-js";
import { readFile } from "fs/promises";
import robot from "@jitsi/robotjs";

const KEY_MAP = {
	48: "Z",
	49: "Z-shift",
	50: "X",
	51: "C-control",
	52: "C",
	53: "V",
	54: "V-shift",
	55: "B",
	56: "B-shift",
	57: "N",
	58: "M-control",
	59: "M",

	60: "A",
	61: "A-shift",
	62: "S",
	63: "S-control",
	64: "D",
	65: "F",
	66: "F-shift",
	67: "G",
	68: "G-shift",
	69: "H",
	70: "J-control",
	71: "J",

	72: "Q",
	73: "Q-shift",
	74: "W",
	75: "E-control",
	76: "E",
	77: "R",
	78: "R-shift",
	79: "T",
	80: "T-shift",
	81: "Y",
	82: "U-control",
	83: "U",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
	const dryRun = process.argv.includes("-n");
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
	!dryRun && await sleep(3000);

	for (const event of midiArray.track[0].event) {
		if (!dryRun && event.deltaTime > 0) {
			const delayMs = (event.deltaTime * microsecondsPerTick) / 1000;
			await sleep(delayMs);
		}

		if (event.type !== 9) continue;

		const noteNumber = event.data[0];
		const keys = KEY_MAP[noteNumber];
		if (!keys) {
			outliners.push(noteNumber);
		} else {
			if (dryRun) continue;
			
			const [key, mod] = keys.split('-');
			console.log(key, mod);
			!!mod ? robot.keyTap(key.toLowerCase(), mod) : robot.keyTap(key.toLowerCase());
		}
	}

	console.log("Done!");
	console.log("Unmapped notes:", outliners.join(" "));
};

main();

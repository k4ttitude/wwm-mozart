import MidiParser from "midi-parser-js";
import { readFile } from "node:fs/promises";
import { KEY_MAP, NOTES } from "./consts.mjs";
import { noteToKeyPress } from "./wwm.mjs";

const getNoteName = (midiNote) => {
	const octave = Math.floor(midiNote / 12) - 1;
	const note = NOTES[midiNote % 12];
	return `${note}${octave}`;
};

const getTrackName = (track) => {
	const nameEvent = track.event.find((e) => e.type === 255 && e.metaType === 3);
	return nameEvent?.data ?? null;
};

export const trackToKeys = (track) => {
	const playable = [];
	const outliners = [];
	track.event
		.filter(
			(e) => e.type === 9 && e.data && e.data.length >= 2 && e.data[1] > 0,
		)
		.forEach((e) => {
			const note = e.data[0];
			const noteName = getNoteName(note);
			const keyPress = noteToKeyPress(note);
			if (!keyPress) {
				outliners.push({ noteName, note });
			} else {
				const { key, modifier } = keyPress;
				playable.push({
					deltaTime: e.deltaTime,
					key,
					modifier,
					noteName,
					note,
				});
			}
		});

	return { playable, outliners };
};

export const midiToKeys = async (midiFile, options = {}) => {
	const {
		trackIndex = null,
		showTiming = false,
		mergeMode = "dedupe", // 'all', 'dedupe', 'melody'
		channelFilter = null, // null or array of channel numbers to include
	} = options;

	// Read and parse MIDI file
	const fileData = await readFile(midiFile, "base64");
	const midi = MidiParser.parse(fileData);

	console.log(`MIDI File: ${midiFile}`);
	console.log(
		`Format: ${midi.formatType}, Tracks: ${midi.track.length}, Ticks per beat: ${midi.timeDivision}`,
	);
	console.log();

	const tracks = midi.track.map((track, index) => {
		const trackName = getTrackName(track) || "Unknown";
		console.log(`Track ${index}: ${trackName}`);

		const keys = trackToKeys(track);

		return keys;
	});

	const outliners = tracks.flatMap((keys) => keys.outliners.map((o) => o.note));
	const uniqueOutliners = new Set(outliners.sort());
	if (uniqueOutliners.size > 0) {
		console.log();
		console.log("Out of range notes:");
		uniqueOutliners.forEach((note) => {
			const noteName = getNoteName(note);
			console.log(`  ${noteName} (MIDI ${note})`);
		});
	}

	return tracks;
};

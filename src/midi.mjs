import MidiParser from "midi-parser-js";
import { readFile } from "node:fs/promises";
import { NOTES } from "./consts.mjs";
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

export const midiToKeys = async (midiFile, options = {}) => {
	const { trackIndex = null, showTiming = false } = options;

	// Read and parse MIDI file
	const fileData = await readFile(midiFile, "base64");
	const midi = MidiParser.parse(fileData);

	console.log(`MIDI File: ${midiFile}`);
	console.log(
		`Format: ${midi.formatType}, Tracks: ${midi.track.length}, Ticks per beat: ${midi.timeDivision}`,
	);
	console.log();

	// Analyze and show track information
	const trackInfo = midi.track.map((track, i) => {
		const noteEvents = track.event.filter(
			(e) => e.type === 9 && e.data && e.data.length >= 2 && e.data[1] > 0,
		);
		const channels = [...new Set(noteEvents.map((e) => e.channel))];
		const noteRange =
			noteEvents.length > 0
				? {
						min: Math.min(...noteEvents.map((e) => e.data[0])),
						max: Math.max(...noteEvents.map((e) => e.data[0])),
					}
				: null;

		return {
			index: i,
			noteCount: noteEvents.length,
			channels,
			noteRange,
			name: getTrackName(track),
		};
	});

	trackInfo.forEach((info) => {
		const rangStr = info.noteRange
			? `${getNoteName(info.noteRange.min)}-${getNoteName(info.noteRange.max)}`
			: "none";
		const channelStr =
			info.channels.length > 0 ? `ch ${info.channels.join(",")}` : "";
		const nameStr = info.name ? `"${info.name}"` : "";
		console.log(
			`Track ${info.index}: ${info.noteCount} notes ${rangStr} ${channelStr} ${nameStr}`.trim(),
		);
	});
	console.log();

	// Collect note events with timing
	const notes = [];
	const tracksToProcess =
		trackIndex !== null ? [midi.track[trackIndex]] : midi.track;

	tracksToProcess.forEach((track, trackIdx) => {
		let currentTime = 0;
		track.event.forEach((event) => {
			currentTime += event.deltaTime;

			// Type 9 = Note On event
			if (event.type === 9 && event.data && event.data.length >= 2) {
				const note = event.data[0];
				const velocity = event.data[1];
				const channel = event.channel || 0;

				// Only process notes with velocity > 0 (velocity 0 = note off)
				if (velocity > 0) {
					notes.push({
						time: currentTime,
						note,
						velocity,
						channel,
						trackIndex: trackIndex !== null ? trackIndex : trackIdx,
					});
				}
			}
		});
	});

	// Sort by time, then by note (for simultaneous notes)
	notes.sort((a, b) => {
		if (a.time !== b.time) return a.time - b.time;
		return a.note - b.note;
	});

	if (notes.length === 0) {
		console.log("No notes found in the MIDI file!");
		return;
	}

	// Step 1: Keep highest note at each time for each track
	const trackMelodies = new Map(); // Map<trackIndex, Map<time, noteEvent>>

	notes.forEach((noteEvent) => {
		const trackKey = noteEvent.trackIndex;

		if (!trackMelodies.has(trackKey)) {
			trackMelodies.set(trackKey, new Map());
		}

		const trackNotes = trackMelodies.get(trackKey);
		const existingNote = trackNotes.get(noteEvent.time);

		if (!existingNote || noteEvent.note > existingNote.note) {
			trackNotes.set(noteEvent.time, noteEvent);
		}
	});

	// Flatten track melodies back to array
	const trackMelodyNotes = [];
	trackMelodies.forEach((trackNotes) => {
		trackNotes.forEach((note) => {
			trackMelodyNotes.push(note);
		});
	});

	// Sort by time, then by note
	trackMelodyNotes.sort((a, b) => {
		if (a.time !== b.time) return a.time - b.time;
		return a.note - b.note;
	});

	// Step 2: Remove duplicate notes across all tracks at same time
	const processedNotes = [];
	let lastTime = -1;
	const notesAtTime = new Set();

	trackMelodyNotes.forEach((noteEvent) => {
		if (noteEvent.time !== lastTime) {
			notesAtTime.clear();
			lastTime = noteEvent.time;
		}

		if (!notesAtTime.has(noteEvent.note)) {
			notesAtTime.add(noteEvent.note);
			processedNotes.push(noteEvent);
		}
	});

	console.log(`Processing: track-melody + dedupe`);
	console.log(
		`  Step 1 (track-melody): ${notes.length} -> ${trackMelodyNotes.length} notes`,
	);
	console.log(
		`  Step 2 (dedupe): ${trackMelodyNotes.length} -> ${processedNotes.length} notes`,
	);

	// Calculate delta times
	let prevTime = 0;
	processedNotes.forEach((note) => {
		note.deltaTime = note.time - prevTime;
		prevTime = note.time;
	});

	console.log();
	// Convert to key sequence
	console.log("=".repeat(60));
	console.log("KEY SEQUENCE:");
	console.log("=".repeat(60));

	const playable = [];
	const outOfRange = [];

	processedNotes.forEach((processedNote) => {
		const { time, deltaTime, note, channel, trackIndex } = processedNote;
		const noteName = getNoteName(note);
		processedNote.noteName = noteName;
		const keyPress = noteToKeyPress(note);

		if (keyPress) {
			const { key, modifier } = keyPress;
			processedNote.key = key;
			processedNote.modifier = modifier;

			playable.push({ noteName, note });

			if (showTiming) {
				console.log(
					`Time: ${String(time).padStart(6)} | DeltaTime: ${String(deltaTime).padStart(6)} | Note: ${noteName.padEnd(4)} (MIDI ${String(note).padStart(3)}) | Ch: ${channel} | Track: ${trackIndex} -> Key: ${key}`,
				);
			}
		} else {
			outOfRange.push({ noteName, note });
		}
	});

	console.log();
	console.log("KEYS TO PRESS:");
	console.log(
		processedNotes
			.map(({ key, modifier }) => (modifier ? `${modifier.at(0)}-${key}` : key))
			.join(" "),
	);
	console.log();
	console.log(
		`Total notes: ${processedNotes.length}, Playable: ${playable.length}, Out of range: ${outOfRange.length}`,
	);

	if (outOfRange.length > 0) {
		console.log("\nOut of range notes (not mapped):");
		const uniqueOutOfRange = [
			...new Map(outOfRange.map((item) => [item.note, item])).values(),
		];
		uniqueOutOfRange.sort((a, b) => a.note - b.note);
		uniqueOutOfRange.forEach(({ noteName, note }) => {
			console.log(`  ${noteName} (MIDI ${note})`);
		});
	}

	return processedNotes;
};

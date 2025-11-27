import { spawn } from "node:child_process";
import { midiToKeys } from "./midi.mjs";

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
	let mergeMode = "all";

	// Parse arguments
	args.slice(1).forEach((arg) => {
		if (arg.startsWith("--merge=")) {
			mergeMode = arg.split("=")[1];
			if (!["all", "dedupe", "melody"].includes(mergeMode)) {
				console.error(
					`Error: Invalid merge mode '${mergeMode}'. Use: all, dedupe, or melody`,
				);
				process.exit(1);
			}
		} else if (arg.startsWith("--channel=")) {
			const channels = arg
				.split("=")[1]
				.split(",")
				.map((c) => parseInt(c.trim(), 10));
			if (channels.some((c) => Number.isNaN(c) || c < 0 || c > 15)) {
				console.error("Error: Channel numbers must be between 0 and 15");
				process.exit(1);
			}
			channelFilter = channels;
		} else if (/^\d+$/.test(arg)) {
			trackIndex = parseInt(arg, 10);
		}
	});

	console.log({ dryRun, trackIndex, showTiming, mergeMode, channelFilter });

	try {
		const tracks = await midiToKeys(midiFile, {
			trackIndex,
			showTiming,
			mergeMode,
			channelFilter,
		});

		tracks.forEach((track) => {
			console.log(
				track.playable
					.map(({ modifier, key }) => (modifier ? `${modifier}-${key}` : key))
					.join(" "),
			);

			if (dryRun) return;

			const child = spawn(
				"node",
				["play-track.mjs", JSON.stringify(track.playable)],
				{ stdio: "inherit" },
			);

			child.on("error", (error) => {
				console.error(
					`Error spawning child process for track ${index}:`,
					error,
				);
			});

			child.on("exit", (code) => {
				if (code !== 0) {
					console.error(`Track ${index} process exited with code ${code}`);
				}
			});
		});
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

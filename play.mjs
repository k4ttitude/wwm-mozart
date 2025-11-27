import { spawn } from "node:child_process";
import { midiToKeys } from "./midi.mjs";
import { sleep } from "./utils.mjs";

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
		}
	});

	console.log({ dryRun, showTiming, mergeMode });

	try {
		const tracks = await midiToKeys(midiFile, {
			showTiming,
			mergeMode,
		});

		tracks.forEach((track, index) => {
			console.log();
			console.log("=".repeat(60));
			console.log(`Track ${index}`);
			console.log("=".repeat(60));
			console.log(
				track.playable
					.map(({ modifier, key }) => (modifier ? `${modifier}-${key}` : key))
					.join(" "),
			);
		});

		if (dryRun) return;

		console.log("Playing in 3 seconds");
		await sleep(3000);
		tracks.forEach((track) => {
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

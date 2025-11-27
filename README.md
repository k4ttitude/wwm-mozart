<h1 align="center">WWM Mozart</h1>
<p align="center">Play any song in Where Winds Meet</p>

## Usage
```sh
pnpm play [options] <midi_file_path> [track_index]
```

### Arguments
- `<midi_file_path>` - Path to the MIDI file to play (required)
- `[track_index]` - Index of specific track to play (optional)

### Options
- `-n, --dry-run` - Check for outlier notes without playing
- `--timing` - Log notes timing information
- `--merge <mode>` - Merge strategy: `all`, `dedupe`, or `melody`. Default: `dedupe`.

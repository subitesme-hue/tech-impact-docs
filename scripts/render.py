"""Render one documentary end to end.

Usage: python3 scripts/render.py props.json
Steps: voice + timeline -> stock media -> Remotion (silent) -> music/SFX mix -> mux at -14 LUFS
       -> out/video.mp4 (full film), out/summary.mp4 (the 30 s summary, for X), out/cover.jpg (frame 0 thumbnail).
Env: VOICE, PEXELS_API_KEY, PIXABAY_API_KEY, CONCURRENCY (default 4), BROWSER_EXECUTABLE (optional).
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
props_in = sys.argv[1]
work = os.path.join(ROOT, 'work'); out = os.path.join(ROOT, 'out')
os.makedirs(work, exist_ok=True); os.makedirs(out, exist_ok=True)
py = sys.executable


def run(cmd, **kw):
    print('$', ' '.join(cmd[:6]), '...' if len(cmd) > 6 else '', flush=True)
    subprocess.run(cmd, check=True, cwd=ROOT, **kw)


run([py, 'scripts/voice.py', props_in, work])
run([py, 'scripts/fetch_media.py', 'props.render.json'])
props = json.load(open(os.path.join(ROOT, 'props.render.json'), encoding='utf-8'))
tl = json.load(open(os.path.join(work, 'timeline.json')))

silent = os.path.join(work, 'silent.mp4')
cmd = ['npx', 'remotion', 'render', 'src/index.ts', 'Doc', silent, '--props=props.render.json', '--muted',
       '--crf=20', '--max-rate=8M', '--buffer-size=16M', '--x264-preset=fast', f"--concurrency={os.environ.get('CONCURRENCY', '4')}", '--timeout=120000', '--log=error']
if os.environ.get('BROWSER_EXECUTABLE'):
    cmd.append(f"--browser-executable={os.environ['BROWSER_EXECUTABLE']}")
run(cmd)

run([py, 'scripts/mix.py', work, props.get('id', 'x')])

video = os.path.join(out, 'video.mp4')
run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', os.path.join(work, 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
     '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', video])

# The 30-second summary on its own (X only accepts 2 min 20 s): cut right before the series ident, fade out.
end = round(tl['summary_end_sec'] + 0.3, 2)
run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-t', str(end), '-vf', f'fade=t=out:st={end - 0.5}:d=0.5',
     '-af', f'afade=t=out:st={end - 0.7}:d=0.7', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-maxrate', '8M', '-bufsize', '16M', '-c:a', 'aac', '-b:a', '160k',
     '-movflags', '+faststart', os.path.join(out, 'summary.mp4')])

# Frame 0 is the designed thumbnail.
run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-frames:v', '1', '-q:v', '2', os.path.join(out, 'cover.jpg')])

dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video],
                           capture_output=True, text=True).stdout.strip() or 0)
json.dump({'duration_sec': dur, 'summary_sec': end, 'voice': props.get('voice'), 'look': props.get('look'),
           'media_stats': props.get('media_stats', {}), 'credits': props.get('media_credits', [])}, open(os.path.join(out, 'meta.json'), 'w'), indent=2)
print(f'done: {dur:.1f}s film, {end:.1f}s summary, voice {props.get("voice")}')

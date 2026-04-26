from youtube_transcript_api import YouTubeTranscriptApi
import sys
import re

def get_video_id(url):
    match = re.search(r'(?:v=|/)([0-9A-Za-z_-]{11}).*', url)
    return match.group(1) if match else None

if len(sys.argv) > 1:
    vid = get_video_id(sys.argv[1])
    try:
        transcript = YouTubeTranscriptApi.get_transcript(vid)
        text = " ".join([t['text'] for t in transcript])
        print(text[:500])
    except Exception as e:
        print(f"ERROR: {e}")

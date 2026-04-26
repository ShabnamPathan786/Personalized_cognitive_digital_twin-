import sys
from youtube_transcript_api import YouTubeTranscriptApi

if len(sys.argv) < 2:
    print("Usage: extract_youtube.py <videoId>")
    sys.exit(1)

video_id = sys.argv[1]

try:
    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)
    # Try to find english natively
    try:
        transcript = transcript_list.find_transcript(['en', 'en-IN', 'en-US', 'en-GB'])
    except:
        # If english is not available, grab the first available one and translate it to English natively
        first_transcript = list(transcript_list)[0]
        if first_transcript.language_code.startswith('en'):
            transcript = first_transcript
        else:
            try:
                transcript = first_transcript.translate('en')
            except:
                transcript = first_transcript
    
    t_data = transcript.fetch()
    # Handle both old dict-style and new dataclass style for safety
    if hasattr(t_data[0], 'text'):
        text = " ".join([t.text for t in t_data])
    else:
        text = " ".join([t['text'] for t in t_data])
    
    # Strip annoying newlines and clean it up
    text = " ".join(text.split())
    
    print("SUCCESS_TRANSCRIPT_START")
    print(text)
    print("SUCCESS_TRANSCRIPT_END")
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)

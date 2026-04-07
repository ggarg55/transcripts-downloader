import os
import re
import glob
import sys

def process_transcripts(directory):
    """
    Finds all .txt files in the given directory and removes the timestamp prefixes,
    replacing them with bullet points.
    
    The timestamp format looks like:
    0:033 secondsSo... 
    1:241 minute, 24 secondsOnce...
    1:23:181 hour, 23 minutes, 18 secondsSo...
    """
    # Regex breakdown:
    # ^\d{1,2}:\d{2}(:\d{2})?  -> Matches digital clock like 0:03, 1:24, or 1:24:33
    # (?: ...)                 -> Group for the written time parts
    # \d+ (?:hour|minute|second)s? -> Matches "1 hour", "3 seconds", "24 minutes"
    # (?:, \d+ (?:hour|minute|second)s?)* -> Matches subsequent parts like ", 24 minutes, 33 seconds"
    pattern = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?(?:\d+ (?:hour|minute|second)s?(?:, \d+ (?:hour|minute|second)s?)*)?")

    txt_files = glob.glob(os.path.join(directory, "*.txt"))
    
    if not txt_files:
        print(f"No .txt files found in {directory}")
        return

    for filepath in txt_files:
        print(f"Processing: {filepath}")
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        new_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Replace the timestamp pattern at the start of the line with a bullet point "- "
            new_line = pattern.sub("- ", line)
            
            # If the original line didn't match the pattern (just in case), we just prefix it
            if new_line == line:
                new_line = "- " + line
                
            new_lines.append(new_line + "\n")
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

    print("Successfully processed all text files.")

if __name__ == "__main__":
    # If a directory is passed in arguments, use it, otherwise use current directory
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    process_transcripts(target_dir)

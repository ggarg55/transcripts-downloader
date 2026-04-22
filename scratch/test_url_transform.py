
import re

def transform_google_url(url):
    if not url: return url
    
    # Extract account index if present (e.g. /u/0/ or /u/1/)
    auth_match = re.search(r'\/u\/([0-9]+)\/', url)
    auth_part = f"/u/{auth_match.group(1)}" if auth_match else ""
    
    # Extract ID (usually follows /d/)
    id_match = re.search(r'\/d\/([^\/?#]+)', url)
    if not id_match: return url
    file_id = id_match.group(1)

    # 1. Google Drive Files - Using docs.google.com
    if 'drive.google.com/file' in url:
        return f"https://docs.google.com{auth_part}/uc?export=download&id={file_id}"

    return url

test_urls = [
    "https://drive.google.com/file/u/1/d/1QPefrkTlIcOqq_syqZhw4Opgjs2hrJjC/view"
]

for url in test_urls:
    print(f"Original: {url}")
    print(f"Transformed: {transform_google_url(url)}")
    print('---')

import time
import re
import feedparser
import requests
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Simple in-memory cache
cache = {
    "data": None,
    "last_fetched": 0,
    "expiry": 300  # 5 minutes cache expiry
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_text(html_content):
    """Convert HTML content into clean plain text suitable for Twitter/X."""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Replace links with text format
    for a in soup.find_all('a'):
        # Just use the text of the link to keep it short, or add link if needed.
        # For Twitter, we want to save space, so we just use the text.
        a.replace_with(a.get_text())
        
    text = soup.get_text(separator=' ').strip()
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text

def parse_entry_to_updates(entry):
    """Parse a single feed entry into structured sub-updates split by <h3> tags."""
    summary = entry.get('summary', '')
    if not summary:
        # Fallback to content if summary is empty
        content_list = entry.get('content', [])
        if content_list and isinstance(content_list, list):
            summary = content_list[0].get('value', '')
            
    if not summary:
        return []
        
    soup = BeautifulSoup(summary, 'html.parser')
    updates = []
    
    current_type = "Update"
    current_html_parts = []
    
    for child in soup.children:
        # Ignore empty NavigableStrings
        if isinstance(child, str) and not child.strip():
            continue
            
        if child.name == 'h3':
            # Save previous update block
            if current_html_parts:
                html_content = "".join(str(p) for p in current_html_parts).strip()
                if html_content:
                    updates.append({
                        "type": current_type,
                        "html": html_content,
                        "text": clean_text(html_content)
                    })
            current_type = child.get_text().strip()
            current_html_parts = []
        else:
            current_html_parts.append(child)
            
    # Save the last block
    if current_html_parts:
        html_content = "".join(str(p) for p in current_html_parts).strip()
        if html_content:
            updates.append({
                "type": current_type,
                "html": html_content,
                "text": clean_text(html_content)
            })
            
    # Fallback if no <h3> tags were found at all
    if not updates and summary:
        updates.append({
            "type": "Update",
            "html": summary,
            "text": clean_text(summary)
        })
        
    return updates

def fetch_and_parse_feed(force_refresh=False):
    """Fetch feed from Google and parse it, using cache if appropriate."""
    now = time.time()
    
    # Return cache if still valid and not forcing a refresh
    if not force_refresh and cache["data"] and (now - cache["last_fetched"] < cache["expiry"]):
        return cache["data"], False

    try:
        # Fetch using requests to handle timeouts and standard user agent
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse xml feed
        feed = feedparser.parse(response.content)
        
        if not feed.entries and feed.bozo:
            raise Exception(f"Failed to parse feed structure: {feed.bozo_exception}")
            
        parsed_entries = []
        for entry in feed.entries:
            parsed_entries.append({
                "id": entry.get('id', ''),
                "date": entry.get('title', 'Unknown Date'),
                "updated": entry.get('updated', ''),
                "link": entry.get('link', ''),
                "updates": parse_entry_to_updates(entry)
            })
            
        # Update cache
        cache["data"] = parsed_entries
        cache["last_fetched"] = now
        return parsed_entries, True
        
    except Exception as e:
        # If fetch fails but we have cached data, return cache with status warning
        if cache["data"]:
            return cache["data"], f"Fetch failed: {str(e)}. Displaying cached data."
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, status = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "success": True,
            "data": data,
            "cached": not status if isinstance(status, bool) else True,
            "warning": status if isinstance(status, str) else None,
            "last_fetched": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache["last_fetched"]))
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)

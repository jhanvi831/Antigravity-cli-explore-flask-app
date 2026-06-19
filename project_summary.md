# BigQuery Release Notes Dashboard

A modern, responsive, and aesthetically rich dashboard that fetches Google BigQuery release notes and provides tools to search, filter, and share updates on X/Twitter.

## Project Structure

The project has been initialized in your workspace: [C:\Users\<user_name>\agy-cli-projects]

* **Backend**:
  * [app.py](file:///C:/Users/ADMIN/agy-cli-projects/app.py): Python Flask server that handles fetching, parsing, caching, and serving the XML feed data.
  * [requirements.txt](file:///C:/Users/ADMIN/agy-cli-projects/requirements.txt): Declares third-party dependencies (`Flask`, `requests`, `feedparser`, `beautifulsoup4`).
* **Frontend**:
  * [templates/index.html](file:///C:/Users/ADMIN/agy-cli-projects/templates/index.html): Clean dashboard structure including filtering panels, search bars, loading spinners, and the tweet composer modal.
  * [static/css/style.css](file:///C:/Users/ADMIN/agy-cli-projects/static/css/style.css): Custom dark-mode style variables, interactive category badges, responsive grid layout, and animations.
  * [static/js/app.js](file:///C:/Users/ADMIN/agy-cli-projects/static/js/app.js): Handles API calls, dynamic rendering, query search highlighting, client-side category counts, and the X/Twitter draft intent.

---

## Technical Highlights

### 1. XML Feed Fetching & Structure Parsing
The Google BigQuery feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) groups release announcements by date, inside which multiple categories of updates (e.g. **Features**, **Announcements**, **Issues**, **Deprecations**) are placed.
* The backend parses this structure by splitting entries dynamically using `<h3>` tags using `BeautifulSoup`.
* Clean text is extracted and pre-processed to compose tweets, removing excessive HTML formatting.

### 2. Performance Caching
To minimize network overhead and respect Google's endpoints:
* An in-memory cache is configured on the Flask server with a 5-minute expiry.
* A **Refresh** button bypasses the cache using the query parameter `?refresh=true` to fetch fresh content on demand.

### 3. Sleek Interactive UI
* **Category Filtering**: Instantly filters updates by type (Features, Announcements, Issues, Deprecations, General Updates) with dynamic update counts shown in the sidebar.
* **Instant Text Search**: Dynamically filters updates based on keywords. Found matches are highlighted on the fly.
* **Twitter/X Integration**: Clicking on any update card opens a beautifully formatted composer modal with character limits, tag suggestions, text copying, and direct sharing options.

---

## How to Run

The server is currently running in your terminal at [http://127.0.0.1:8080](http://127.0.0.1:8080).

If you need to start it manually in the future, run:
```powershell
& "C:\Users\<user_name>\AppData\Local\Programs\Python\Python314\python.exe" app.py
```

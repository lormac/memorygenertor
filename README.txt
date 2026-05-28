Dino Generator Launch Pack

IMPORTANT:
Do NOT double click index.html directly.
If you double click it, the browser may show "Failed to fetch" when you enter the code.

Use START_SERVER.bat instead.

How to start:
1. Unzip this folder.
2. Put your theme assets inside:
   themes/dino_birthday/
3. Double click:
   START_SERVER.bat
4. Keep the black server window open.
5. The browser should open:
   http://localhost:8000/index.html
6. Enter code:
   DINO-BUNDLE

Folder structure:

index.html
START_SERVER.bat
START_SERVER.ps1
data/access_codes.json
themes/dino_birthday/theme.json
themes/dino_birthday/layouts/
themes/dino_birthday/backgrounds/
themes/dino_birthday/decor/

Why this is needed:
The generator uses fetch() to load:
data/access_codes.json
themes/dino_birthday/theme.json
your slide layout JSON files

Browsers usually block fetch() when index.html is opened as a plain file.
Running python -m http.server 8000 fixes that.

If START_SERVER.bat says Python is not recognized:
Install Python from python.org, or open the folder in VS Code and use the Live Server extension.

Demo access codes:
DINO-BUNDLE
DINO-SHOW


HD EXPORT UPDATE:
This version forces the canvas to 1920 x 1080 and records WebM at a higher video bitrate to reduce pixelation. Make sure your background PNGs are also at least 1920 x 1080 for best quality.

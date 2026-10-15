from pathlib import Path
import urllib.parse
import os

# Mimic main.py logic
BASE_DIR = Path(__file__).parent
PDF_DIRECTORY = BASE_DIR / "data"

print(f"Base Directory: {BASE_DIR}")
print(f"PDF Directory: {PDF_DIRECTORY}")
print(f"PDF Directory Exists: {PDF_DIRECTORY.exists()}")

filename = "IPC%20Hindi.pdf"
decoded_filename = urllib.parse.unquote(filename)
file_path = PDF_DIRECTORY / decoded_filename

print(f"Requested Filename: {filename}")
print(f"Decoded Filename: {decoded_filename}")
print(f"Resolved File Path: {file_path}")
print(f"File Exists: {file_path.exists()}")

# List all files in data to be sure
print("\nFiles in data directory:")
if PDF_DIRECTORY.exists():
    for f in PDF_DIRECTORY.glob("*"):
        print(f" - '{f.name}'")
else:
    print("Data directory does not exist!")

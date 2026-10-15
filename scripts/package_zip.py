import os
import zipfile
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_ZIP = os.path.join(ROOT_DIR, "Kanta-Android-Project.zip")
PUBLIC_ZIP = os.path.join(ROOT_DIR, "public", "Kanta-Android-Project.zip")
DIST_ZIP = os.path.join(ROOT_DIR, "dist", "Kanta-Android-Project.zip")

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    ".gradle",
    "build",
    ".cache",
    ".idea",
    "__pycache__"
}

EXCLUDE_FILES = {
    "Kanta-Android-Project.zip",
    "bun.lock",
    "_tmp_fg.svg",
    "_tmp_logo.svg",
    "_tmp_round.svg"
}

def should_exclude(rel_path):
    parts = rel_path.split(os.sep)
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True
        if part.startswith(".") and part not in [".gitignore"]:
            return True
    filename = os.path.basename(rel_path)
    if filename in EXCLUDE_FILES or filename.endswith(".zip"):
        return True
    return False

print(f"Creating project ZIP from: {ROOT_DIR}")

with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(ROOT_DIR):
        # Filter directories in-place to prevent walking into excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not (d.startswith(".") and d != ".")]
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, ROOT_DIR)
            if should_exclude(rel_path):
                continue
            # Preserve file permissions (e.g., gradlew executable bit)
            st = os.stat(full_path)
            zinfo = zipfile.ZipInfo.from_file(full_path, arcname=rel_path)
            zinfo.external_attr = (st.st_mode & 0xFFFF) << 16
            with open(full_path, "rb") as f:
                zipf.writestr(zinfo, f.read())

zip_size_mb = os.path.getsize(OUTPUT_ZIP) / (1024 * 1024)
print(f"Project ZIP successfully created: {OUTPUT_ZIP} ({zip_size_mb:.2f} MB)")

# Copy to public/ and dist/
os.makedirs(os.path.join(ROOT_DIR, "public"), exist_ok=True)
shutil.copy2(OUTPUT_ZIP, PUBLIC_ZIP)
print(f"Copied to public: {PUBLIC_ZIP}")

if os.path.exists(os.path.join(ROOT_DIR, "dist")):
    shutil.copy2(OUTPUT_ZIP, DIST_ZIP)
    print(f"Copied to dist: {DIST_ZIP}")

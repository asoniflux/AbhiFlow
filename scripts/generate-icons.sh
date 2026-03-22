#!/bin/bash
# Generate AbhiFlow app icon (.icns) and tray icons from a source PNG.
# If no source PNG exists, creates a simple branded icon using sips.
#
# Usage: bash scripts/generate-icons.sh [source-1024x1024.png]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_DIR/assets"

mkdir -p "$ASSETS_DIR"

SOURCE_PNG="${1:-}"

# If no source provided, create a simple icon using Python (available on macOS)
if [ -z "$SOURCE_PNG" ] || [ ! -f "$SOURCE_PNG" ]; then
  echo "No source PNG provided. Generating a default AbhiFlow icon..."

  python3 -c "
import struct, zlib

def create_png(width, height, pixels):
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    header = b'\\x89PNG\\r\\n\\x1a\\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\\x00'
        for x in range(width):
            raw += bytes(pixels(x, y, width, height))

    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def icon_pixel(x, y, w, h):
    cx, cy = w/2, h/2
    r = min(w, h) * 0.42
    dist = ((x - cx)**2 + (y - cy)**2) ** 0.5

    if dist < r:
        # Gradient: #4f6ef7 (top) to #3b5de6 (bottom)
        t = y / h
        return (int(79 - 20*t), int(110 - 15*t), int(247 - 17*t), 255)
    elif dist < r + 2:
        # Anti-alias edge
        alpha = max(0, min(255, int(255 * (r + 2 - dist) / 2)))
        t = y / h
        return (int(79 - 20*t), int(110 - 15*t), int(247 - 17*t), alpha)
    else:
        return (0, 0, 0, 0)

def tray_pixel(x, y, w, h, recording=False):
    cx, cy = w/2, h/2
    # Microphone shape: vertical rectangle + circle on top
    mic_w, mic_h = w*0.28, h*0.4
    mic_top = cy - h*0.15

    # Circle top of mic
    circle_r = mic_w * 0.5
    circle_cy = mic_top
    dist_circle = ((x - cx)**2 + (y - circle_cy)**2) ** 0.5

    # Rectangle body
    in_rect = abs(x - cx) < mic_w/2 and mic_top < y < mic_top + mic_h

    # Stand (thin line)
    in_stand = abs(x - cx) < w*0.04 and mic_top + mic_h <= y < mic_top + mic_h + h*0.15

    # Base (horizontal line)
    in_base = abs(y - (mic_top + mic_h + h*0.15)) < h*0.04 and abs(x - cx) < w*0.18

    # Arc around mic
    arc_r = mic_w * 0.85
    arc_dist = ((x - cx)**2 + (y - (mic_top + mic_h*0.4))**2) ** 0.5
    in_arc = abs(arc_dist - arc_r) < w*0.06 and y > mic_top + mic_h*0.2 and y < mic_top + mic_h + h*0.05

    if dist_circle < circle_r or in_rect or in_stand or in_base or in_arc:
        if recording:
            return (255, 59, 48, 255)  # Red
        else:
            return (79, 110, 247, 255)  # Blue
    return (0, 0, 0, 0)

# Generate 1024x1024 app icon
with open('$ASSETS_DIR/icon.png', 'wb') as f:
    f.write(create_png(1024, 1024, icon_pixel))
print('Created icon.png (1024x1024)')

# Generate tray icons (36x36, will be displayed at 18x18 @2x)
def tray_normal(x, y, w, h):
    return tray_pixel(x, y, w, h, False)
def tray_recording(x, y, w, h):
    return tray_pixel(x, y, w, h, True)

with open('$ASSETS_DIR/tray-icon.png', 'wb') as f:
    f.write(create_png(36, 36, tray_normal))
print('Created tray-icon.png (36x36)')

with open('$ASSETS_DIR/tray-icon-recording.png', 'wb') as f:
    f.write(create_png(36, 36, tray_recording))
print('Created tray-icon-recording.png (36x36)')
"

  SOURCE_PNG="$ASSETS_DIR/icon.png"
fi

# Generate .icns from the 1024x1024 PNG using macOS iconutil
echo "Generating .icns from $SOURCE_PNG..."

ICONSET_DIR="$ASSETS_DIR/AbhiFlow.iconset"
mkdir -p "$ICONSET_DIR"

# Create all required sizes
sips -z 16 16     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_16x16.png"      > /dev/null 2>&1
sips -z 32 32     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png"   > /dev/null 2>&1
sips -z 32 32     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_32x32.png"      > /dev/null 2>&1
sips -z 64 64     "$SOURCE_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png"   > /dev/null 2>&1
sips -z 128 128   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_128x128.png"    > /dev/null 2>&1
sips -z 256 256   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null 2>&1
sips -z 256 256   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_256x256.png"    > /dev/null 2>&1
sips -z 512 512   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null 2>&1
sips -z 512 512   "$SOURCE_PNG" --out "$ICONSET_DIR/icon_512x512.png"    > /dev/null 2>&1
sips -z 1024 1024 "$SOURCE_PNG" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1

iconutil -c icns "$ICONSET_DIR" -o "$ASSETS_DIR/icon.icns"
rm -rf "$ICONSET_DIR"

echo "Done! Generated:"
echo "  $ASSETS_DIR/icon.icns (app icon)"
echo "  $ASSETS_DIR/icon.png (source)"
echo "  $ASSETS_DIR/tray-icon.png (menu bar)"
echo "  $ASSETS_DIR/tray-icon-recording.png (menu bar, recording)"

"""Generate PNG icons for the Lumina AI Chrome extension."""
import struct, zlib, math
import os

def create_png(size):
    """Create a gradient icon PNG with the ✦ symbol using pure Python."""
    pixels = []
    cx, cy = size / 2, size / 2
    r = size / 2

    for y in range(size):
        row = []
        for x in range(size):
            # Circular mask with soft edge
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if dist > r:
                row.extend([0, 0, 0, 0])
                continue

            # Gradient: top-left neon teal → bottom-right neon violet/magenta
            t = (x + y) / (size * 2)
            # Teal (#06b6d4) to Violet (#8b5cf6) to Magenta (#d946ef)
            if t < 0.5:
                t2 = t * 2
                red   = int(0x06 + t2 * (0x8b - 0x06))
                green = int(0xb6 + t2 * (0x5c - 0xb6))
                blue  = int(0xd4 + t2 * (0xf6 - 0xd4))
            else:
                t2 = (t - 0.5) * 2
                red   = int(0x8b + t2 * (0xd9 - 0x8b))
                green = int(0x5c + t2 * (0x46 - 0x5c))
                blue  = int(0xf6 + t2 * (0xef - 0xf6))

            # Draw a simple 4-pointed star (✦) in white
            nx, ny = (x - cx) / r, (y - cy) / r
            on_star = False
            angle = math.atan2(ny, nx)
            dist_n = math.sqrt(nx**2 + ny**2)
            if dist_n < 0.65:
                star_r = 0.18 + 0.42 * abs(math.cos(2 * angle))
                if dist_n < star_r:
                    on_star = True

            alpha = 255
            # Soft edge
            if dist > r - 1.5:
                alpha = int(255 * (r - dist) / 1.5)

            if on_star:
                row.extend([255, 255, 255, alpha])
            else:
                row.extend([red, green, blue, alpha])
        pixels.append(row)

    # Build PNG
    def png_chunk(name, data):
        chunk = name + data
        return struct.pack(">I", len(data)) + chunk + struct.pack(">I", zlib.crc32(chunk) & 0xffffffff)

    raw_rows = b""
    for row in pixels:
        raw_rows += b"\x00" + bytes(row)

    ihdr_data = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat_data = zlib.compress(raw_rows)

    png = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr_data)
        + png_chunk(b"IDAT", idat_data)
        + png_chunk(b"IEND", b"")
    )
    return png

# Ensure icons directory exists relative to current folder
os.makedirs("icons", exist_ok=True)

for size in [16, 48, 128]:
    with open(f"icons/icon{size}.png", "wb") as f:
        f.write(create_png(size))
    print(f"Created icons/icon{size}.png")

print("Done!")

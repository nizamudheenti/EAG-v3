"""Generate PNG icons for the DataLab AI Chrome extension."""
import struct, zlib, math
import os

def create_png(size):
    """Create a gradient icon PNG with a math/data symbol using pure Python."""
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

            # Gradient: top-left deep indigo → bottom-right warm amber/orange
            t = (x + y) / (size * 2)
            # Indigo (#312e81) to Amber (#d97706) to Gold (#fbbf24)
            if t < 0.5:
                t2 = t * 2
                red   = int(0x31 + t2 * (0xd9 - 0x31))
                green = int(0x2e + t2 * (0x77 - 0x2e))
                blue  = int(0x81 + t2 * (0x06 - 0x81))
            else:
                t2 = (t - 0.5) * 2
                red   = int(0xd9 + t2 * (0xfb - 0xd9))
                green = int(0x77 + t2 * (0xbf - 0x77))
                blue  = int(0x06 + t2 * (0x24 - 0x06))

            # Draw a stylized mathematical symbol (like a lambda λ or delta Δ or sum Σ)
            # Let's draw a nice stylized lambda symbol "λ" in white in the center
            nx, ny = (x - cx) / r, (y - cy) / r
            on_symbol = False

            # Draw lambda: two main stroke lines
            # Left leg: y = -2x - 0.2 from top-left to middle
            # Right leg: y = 2x from top-right to bottom-left
            # We can define mathematical coordinates (scale is -1 to 1)
            # Let's check distance to lambda stroke lines
            px = nx * 1.5
            py = ny * 1.5
            
            # Main diagonal line: py = -1.8 * px
            dist_line1 = abs(py + 1.8 * px) / math.sqrt(1 + 1.8**2)
            # Back leg (starts from middle of main line around px=0, py=0 to bottom right px=0.6, py=0.9)
            # Line equation for back leg: py = 1.2 * px (for px > -0.1)
            dist_line2 = 100
            if px > -0.2:
                dist_line2 = abs(py - 1.3 * px - 0.1) / math.sqrt(1 + 1.3**2)

            if dist_n := math.sqrt(px**2 + py**2) < 0.65:
                # Main stroke thickness
                if dist_line1 < 0.12 and py > -0.6 and py < 0.6:
                    on_symbol = True
                elif dist_line2 < 0.12 and py > 0.0 and py < 0.6:
                    on_symbol = True

            alpha = 255
            # Soft edge
            if dist > r - 1.5:
                alpha = int(255 * (r - dist) / 1.5)

            if on_symbol:
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

# Ensure icons directory exists
os.makedirs("icons", exist_ok=True)

for size in [16, 48, 128]:
    with open(f"icons/icon{size}.png", "wb") as f:
        f.write(create_png(size))
    print(f"Created icons/icon{size}.png")

print("Done!")

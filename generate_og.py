from PIL import Image, ImageDraw, ImageFont

# 1. Initialize 1200x630 Open Graph Canvas
WIDTH, HEIGHT = 1200, 630
img = Image.new("RGB", (WIDTH, HEIGHT), color="#0b0e14")
draw = ImageDraw.Draw(img)

# 2. 2:1 Isometric Projection Function
ORIGIN_X, ORIGIN_Y = 850, 160
TILE_W, TILE_H = 36, 18

def iso_project(x, y, z=0):
    """Converts 3D grid coordinates (x, y, z) to 2D screen pixels."""
    screen_x = ORIGIN_X + (x - y) * TILE_W
    screen_y = ORIGIN_Y + (x + y) * TILE_H - (z * 32)
    return (screen_x, screen_y)

# 3. Draw Isometric Ground Wireframe Grid
GRID_SIZE = 10
for i in range(GRID_SIZE + 1):
    # Lines along X and Y axes
    draw.line([iso_project(i, 0), iso_project(i, GRID_SIZE)], fill="#1a2639", width=2)
    draw.line([iso_project(0, i), iso_project(GRID_SIZE, i)], fill="#1a2639", width=2)

# 4. Helper to Draw Procedural Isometric Soundstage Volumes
def draw_iso_box(gx, gy, w, d, h, fill_top, fill_left, fill_right, outline):
    # Top face vertices
    t1 = iso_project(gx, gy, h)
    t2 = iso_project(gx + w, gy, h)
    t3 = iso_project(gx + w, gy + d, h)
    t4 = iso_project(gx, gy + d, h)
    # Base vertices
    b2 = iso_project(gx + w, gy, 0)
    b3 = iso_project(gx + w, gy + d, 0)
    b4 = iso_project(gx, gy + d, 0)

    # Render faces (painter's algorithm order: left, right, top)
    draw.polygon([t4, t3, b3, b4], fill=fill_left, outline=outline, width=2)
    draw.polygon([t3, t2, b2, b3], fill=fill_right, outline=outline, width=2)
    draw.polygon([t1, t2, t3, t4], fill=fill_top, outline=outline, width=2)

# 5. Render Backlot Soundstages (Back-to-Front Order)
# Stage A: Main Soundstage (Cyan Neon Wireframe)
draw_iso_box(1, 1, 3, 3, 3.2, "#162936", "#0d1821", "#11202b", "#00f0ff")
# Stage B: Pipeline Lab Tower (Magenta Neon Wireframe)
draw_iso_box(5, 1, 2, 2, 4.5, "#2b1228", "#1a0b18", "#220e20", "#ff007f")
# Stage C: FX Workshop (Cyan Accent Volume)
draw_iso_box(2, 5, 3, 2, 2.0, "#162936", "#0d1821", "#11202b", "#00f0ff")
# Stage D: Foreground Gatehouse
draw_iso_box(6, 5, 2, 3, 1.5, "#1f2430", "#13161f", "#181c26", "#a855f7")

# 6. Load Scaled Typography (Pillow 10.1+ built-in scalable default font)
try:
    font_title = ImageFont.load_default(size=64)
    font_role = ImageFont.load_default(size=32)
    font_tags = ImageFont.load_default(size=22)
    font_url = ImageFont.load_default(size=26)
except TypeError:
    # Fallback for older Pillow versions
    font_title = font_role = font_tags = font_url = ImageFont.load_default()

# 7. Render Left-Hand Portfolio Branding & Accent Bars
draw.rectangle([(60, 130), (68, 500)], fill="#00f0ff")
draw.text((95, 135), "ROB PEARSON", fill="#ffffff", font=font_title)
draw.text((95, 220), "CG Supervisor & Pipeline Lead", fill="#00f0ff", font=font_role)
draw.text((95, 285), "Houdini  •  Nuke  •  Solaris  •  VFX", fill="#94a3b8", font=font_tags)

# Interactive Badge & Domain
draw.rounded_rectangle([(95, 435), (495, 495)], radius=8, fill="#131a26", outline="#ff007f", width=2)
draw.text((120, 452), "proprietaryoptics.com", fill="#ff007f", font=font_url)

# Save Final Open Graph Asset
img.save("preview.jpg", "JPEG", quality=95)
print("Generated preview.jpg (1200x630) successfully!")

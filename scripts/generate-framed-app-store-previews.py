from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ROOT / "screenshots" / "app-store-previews"
OUTPUT_DIR = ROOT / "screenshots" / "app-store-framed-previews"
BACKGROUND_IMAGE = ROOT / "src" / "assets" / "images" / "roanoke-landing.png"

WIDTH = 1284
HEIGHT = 2778
PHONE_W = 900
PHONE_H = 1946
PHONE_X = (WIDTH - PHONE_W) // 2
PHONE_Y = 705
BORDER = 22
RADIUS = 96

GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
AVENIR = "/System/Library/Fonts/Avenir.ttc"

PREVIEWS = [
    {
        "input": "01-home-1284x2778.jpg",
        "output": "01-explore-the-mystery-1284x2778.png",
        "eyebrow": "Roanoke Island",
        "title": "Explore the mystery",
        "subtitle": "A junior history guide to the Lost Colony.",
        "accent": (110, 166, 161),
    },
    {
        "input": "02-clues-1284x2778.jpg",
        "output": "02-study-the-clues-1284x2778.png",
        "eyebrow": "Evidence Trail",
        "title": "Study the clues",
        "subtitle": "Review the carvings, signs, and evidence left behind.",
        "accent": (185, 95, 72),
    },
    {
        "input": "03-theories-1284x2778.jpg",
        "output": "03-build-your-theory-1284x2778.png",
        "eyebrow": "Junior Historian",
        "title": "Build your theory",
        "subtitle": "Compare ideas and decide what may have happened.",
        "accent": (217, 166, 87),
    },
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def centered_text(draw: ImageDraw.ImageDraw, y: int, text: str, text_font: ImageFont.FreeTypeFont, fill) -> None:
    box = draw.textbbox((0, 0), text, font=text_font)
    draw.text(((WIDTH - (box[2] - box[0])) // 2, y), text, font=text_font, fill=fill)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        box = draw.textbbox((0, 0), candidate, font=text_font)
        if box[2] - box[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def compose_phone(screen: Image.Image) -> Image.Image:
    phone = Image.new("RGBA", (PHONE_W, PHONE_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(phone)

    draw.rounded_rectangle(
        (0, 0, PHONE_W - 1, PHONE_H - 1),
        radius=RADIUS,
        fill=(12, 23, 18, 255),
    )
    draw.rounded_rectangle(
        (8, 8, PHONE_W - 9, PHONE_H - 9),
        radius=RADIUS - 8,
        outline=(248, 252, 246, 210),
        width=4,
    )

    inner = (PHONE_W - BORDER * 2, PHONE_H - BORDER * 2)
    fitted = screen.resize(inner, Image.Resampling.LANCZOS).convert("RGBA")
    screen_mask = rounded_mask(inner, RADIUS - 30)
    phone.alpha_composite(fitted, (BORDER, BORDER))
    phone.putalpha(rounded_mask((PHONE_W, PHONE_H), RADIUS))

    clipped = Image.new("RGBA", phone.size, (0, 0, 0, 0))
    clipped.alpha_composite(fitted, (BORDER, BORDER))
    clipped.putalpha(screen_mask.resize(phone.size, Image.Resampling.LANCZOS))

    return phone


def add_phone(canvas: Image.Image, phone: Image.Image) -> None:
    shadow = Image.new("RGBA", (PHONE_W + 160, PHONE_H + 160), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (80, 80, PHONE_W + 80, PHONE_H + 80),
        radius=RADIUS,
        fill=(23, 32, 24, 96),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    canvas.alpha_composite(shadow, (PHONE_X - 80, PHONE_Y - 55))
    canvas.alpha_composite(phone, (PHONE_X, PHONE_Y))


def make_background() -> Image.Image:
    source = Image.open(BACKGROUND_IMAGE).convert("RGB")
    background = source.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    background = background.filter(ImageFilter.GaussianBlur(18)).convert("RGBA")

    shade = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shade_pixels = shade.load()
    for x in range(WIDTH):
        for y in range(HEIGHT):
            top = 122 if y < 640 else 72
            bottom = min(132, int(y / HEIGHT * 92))
            side = int(abs(x - WIDTH / 2) / (WIDTH / 2) * 35)
            shade_pixels[x, y] = (13, 18, 13, min(232, top + bottom + side))

    background = Image.alpha_composite(background, shade)

    wash = Image.new("RGBA", (WIDTH, HEIGHT), (16, 21, 15, 118))
    background = Image.alpha_composite(background, wash)

    draw = ImageDraw.Draw(background)
    draw.rounded_rectangle((90, 572, WIDTH - 90, HEIGHT - 98), radius=118, outline=(246, 198, 111, 54), width=3)
    draw.line((150, 612, WIDTH - 150, 612), fill=(246, 198, 111, 74), width=2)
    draw.line((150, HEIGHT - 140, WIDTH - 150, HEIGHT - 140), fill=(246, 198, 111, 42), width=2)
    draw.ellipse((-120, 2240, 230, 2590), outline=(246, 198, 111, 42), width=4)
    draw.ellipse((1055, 2160, 1375, 2480), outline=(185, 95, 72, 38), width=4)
    draw.ellipse((980, 120, 1330, 470), outline=(110, 166, 161, 30), width=4)
    return background


def render(preview: dict[str, object]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    canvas = make_background()
    draw = ImageDraw.Draw(canvas)

    accent = preview["accent"]

    eyebrow_font = font(AVENIR, 34)
    title_font = font(GEORGIA_BOLD, 91)
    subtitle_font = font(AVENIR, 43)

    centered_text(draw, 155, str(preview["eyebrow"]), eyebrow_font, (*accent, 255))
    centered_text(draw, 250, str(preview["title"]), title_font, (247, 237, 213, 255))

    subtitle_lines = wrap_text(draw, str(preview["subtitle"]), subtitle_font, 950)
    subtitle_y = 398
    for line in subtitle_lines:
        centered_text(draw, subtitle_y, line, subtitle_font, (222, 205, 174, 255))
        subtitle_y += 58

    line_y = subtitle_y + 18
    draw.rounded_rectangle((WIDTH // 2 - 175, line_y, WIDTH // 2 + 175, line_y + 7), radius=4, fill=(246, 198, 111, 190))

    screen = Image.open(INPUT_DIR / str(preview["input"])).convert("RGB")
    phone = compose_phone(screen)
    add_phone(canvas, phone)

    out = OUTPUT_DIR / str(preview["output"])
    canvas.convert("RGB").save(out, optimize=True)


def main() -> None:
    for preview in PREVIEWS:
        render(preview)
    print(OUTPUT_DIR)


if __name__ == "__main__":
    main()

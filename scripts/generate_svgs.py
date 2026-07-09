import os

svg_template = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="{bg_color}" rx="50" ry="50"/>
  <!-- Football Shirt -->
  <path d="M 25 30 L 40 20 L 60 20 L 75 30 L 80 45 L 70 50 L 65 40 L 65 80 L 35 80 L 35 40 L 30 50 L 20 45 Z" fill="{shirt_color}"/>
  <!-- Shirt details (collar/stripes) -->
  <path d="M 40 20 Q 50 30 60 20" fill="none" stroke="{detail_color}" stroke-width="3"/>
  <rect x="45" y="30" width="10" height="50" fill="{detail_color}" opacity="0.8"/>
</svg>"""

colors = [
    ("red-white", "#1e293b", "#ef4444", "#ffffff"),
    ("blue-white", "#1e293b", "#3b82f6", "#ffffff"),
    ("green-white", "#1e293b", "#10b981", "#ffffff"),
    ("white-black", "#1e293b", "#ffffff", "#000000"),
    ("yellow-blue", "#1e293b", "#eab308", "#2563eb"),
    ("black-gold", "#1e293b", "#171717", "#eab308"),
    ("purple-white", "#1e293b", "#a855f7", "#ffffff"),
    ("orange-black", "#1e293b", "#f97316", "#000000"),
]

os.makedirs(r"d:\projects\pitchsense\web\public\avatars", exist_ok=True)

for name, bg, shirt, detail in colors:
    svg = svg_template.format(bg_color=bg, shirt_color=shirt, detail_color=detail)
    with open(rf"d:\projects\pitchsense\web\public\avatars\shirt-{name}.svg", "w") as f:
        f.write(svg)

print("Generated 8 football shirt SVGs.")

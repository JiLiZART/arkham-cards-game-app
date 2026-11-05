#!/usr/bin/env bash
# Convert the token, class shield and class background art the author supplied (dropped in inspired/user-art, origin not
# recorded beyond "supplied by the author") into the WebP files the app reads (run once; outputs are committed):
#   public/icons/{damage,horror,doom,resource,clue}.webp   the cardboard tokens (health.png → damage, sanity.png → horror)
#   public/icons/{clue-3,resource-3,resource-5}.webp      their stacks: offset copies of the single token with the count
#   public/icons/class-<class>.webp                       the class shields, drawn as large badges
#   public/art/investigator-bg/<class>.webp               the class paintings behind the investigator panel
# Needs ImageMagick (magick) and cwebp.   bash scripts/convert-user-art.sh [source folder]
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=${1:-inspired/user-art}
OUT=public/icons
BG=public/art/investigator-bg
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$BG"

# lossy colour, lossless-ish alpha: the edges stay clean on the dark table
webp() { cwebp -quiet -q "$3" -alpha_q 90 -m 6 -metadata none "$1" -o "$2"; }

# tokens are drawn at 14-64 css px: 256 px covers 4x; never upscaled
while read -r dst src; do
  magick "$SRC/$src.png" -trim +repage -resize '256x256>' "$TMP/$dst.png"
  webp "$TMP/$dst.png" "$OUT/$dst.webp" 85
done <<'MAP'
damage health
horror sanity
doom doom
clue clue
resource resource
MAP

# a stack: n copies of the token, each a step up and to the right of the one in front, and the count in the corner
stack() { # name single n
  local n=$3 size=200 step=12 canvas
  canvas=$((size + (n - 1) * step))
  local args=(-size "${canvas}x${canvas}" xc:none)
  for ((k = n - 1; k >= 0; k--)); do
    args+=(\( "$TMP/$2.png" -resize "${size}x${size}" \) -geometry "+$((k * step))+$(((n - 1 - k) * step))" -composite)
  done
  magick "${args[@]}" -gravity southeast -font public/fonts/Alegreya-Bold.ttf -pointsize $((size * 11 / 20)) \
    -stroke '#1a1410' -strokewidth 14 -fill '#1a1410' -annotate +6+0 "$n" \
    -stroke none -fill '#f1e8d0' -annotate +6+0 "$n" "$TMP/$1.png"
  webp "$TMP/$1.png" "$OUT/$1.webp" 85
}
stack clue-3 clue 3
stack resource-3 resource 3
stack resource-5 resource 5

# class shields: 75-103 px sources, drawn at 22-34 css px. Every shield fits the same 104 px tall box (124 wide for the wide
# survivor) centred in one 128 px transparent square, so they look one size side by side
for c in guardian seeker rogue mystic survivor; do
  magick "$SRC/$c.png" -trim +repage -resize '124x104' -background none -gravity center -extent 128x128 "$TMP/class-$c.png"
  webp "$TMP/class-$c.png" "$OUT/class-$c.webp" 88
done

# class paintings: the investigator panel is 500 css px wide (less on smaller windows); 1000 x 480 covers it at 2x,
# cropped from the centre. It sits under a scrim: a slight blur (the neutral damask's noise halves) and a low quality don't show
for c in guardian seeker rogue mystic survivor neutral; do
  magick "$SRC/investigator_bg/$c.jpg" -resize '1000x480^' -gravity center -extent 1000x480 -blur 0x0.8 -strip "$TMP/bg-$c.png"
  cwebp -quiet -q 60 -m 6 -metadata none "$TMP/bg-$c.png" -o "$BG/$c.webp"
done

ls -l "$OUT"/{damage,horror,doom,clue,clue-3,resource,resource-3,resource-5}.webp "$OUT"/class-*.webp "$BG"/*.webp | awk '{print $5, $NF}'

#!/usr/bin/env bash
# Copy the cardboard token art and table art from inspired/ into public/ (run once; outputs are committed).
# Every other icon is a symbol of the sprite built by scripts/import-icons.ts.
# Needs: ImageMagick (magick), node.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=inspired/icons
AC_ASSETS=inspired/ArkhamCards/assets
OUT=public/icons
mkdir -p "$OUT" public/table

# target name  ←  source file
# only the cardboard tokens the icon set doesn't draw are copied: damage, horror, doom, lead, the connector plaques.
# Tokens and plaques come on an opaque white box; $SRC/transparent has them cut out by hand, but its cut also
# cleared white inside the art (the heart, the 3s). Keep its outline, fill the holes: alpha = its alpha, or opaque
# for anything not reachable from the border through fully transparent pixels (eroded 1px to keep its soft edge).
rm -f "$OUT"/*.png  # the sprite (sprite.svg) is not touched
TMP=$(mktemp -d)
while read -r dst src; do
  magick "$SRC/transparent/$src" -alpha extract -threshold 0 -bordercolor black -border 1 -fill gray50 -draw "color 0,0 floodfill" \
    -fill white +opaque gray50 -fill black -opaque gray50 -shave 1x1 -morphology Erode Disk:1 "$TMP/inside.png"
  magick "$SRC/transparent/$src" -alpha extract "$TMP/inside.png" -compose Lighten -composite "$TMP/alpha.png"
  magick "$SRC/$src" -alpha off "$TMP/alpha.png" -compose CopyOpacity -composite "$OUT/$dst.png"
done <<'MAP'
damage damage-token-one.png
horror horror-token.png
doom doom-token.png
lead token-lead-player.png
connector-both connector-both-ways.png
connector-one-way connector-one-way-from-left-to-right.png
MAP
rm -rf "$TMP"

# card backs from ArkhamCards, mapped by their art: its file names are swapped relative to the printed game
# (encounter-back.png is the sepia tentacle player back, player-back.png the blue eclipse encounter back)
magick "$AC_ASSETS/encounter-back.png" \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 %[fx:w-1],%[fx:h-1] 34,34" \) -alpha off -compose CopyOpacity -composite public/table/back-player.png
cp "$AC_ASSETS/player-back.png" public/table/back-encounter.png

# the play-area background with its green frame
magick inspired/icons/table-bg.png -quality 82 public/table/table-bg.jpg

# ArkhamCards fonts. Icon fonts (IcoMoon): name, ttf, glyph config. Card fonts are copied as they are.
AC=inspired/ArkhamCards/assets
mkdir -p public/fonts
FONTS="arkhamicons:arkhamicons.ttf:arkhamicons-config.json
arkhamslim:arkhamslim.ttf:arkhamslim.json
tokens:tokens.ttf:tokens.json
blood:blood.ttf:blood.json
standalone:standalone.ttf:standalone.json"
args=()
while IFS=: read -r name ttf cfg; do
  cp "$AC/$ttf" "public/fonts/$name.ttf"
  args+=("$name=$AC/$cfg")
done <<<"$FONTS"
for f in Teutonic.ttf "Teutonic RU.ttf" Alegreya-Regular.ttf Alegreya-Bold.ttf Alegreya-Italic.ttf; do
  cp "$AC/$f" "public/fonts/${f// /-}"
done
# glyph name → code point per font, from the IcoMoon configs (components never hard-code code points)
node -e '
const fs = require("fs");
const out = {};
for (const a of process.argv.slice(1)) {
  const [name, file] = a.split("=");
  out[name] = Object.fromEntries(JSON.parse(fs.readFileSync(file, "utf8")).icons.map((i) => [i.properties.name, i.properties.code]));
}
fs.writeFileSync("src/ui/glyphs.generated.json", JSON.stringify(out, null, 1) + "\n");
' "${args[@]}"
echo "icons: $(ls $OUT | wc -l | tr -d ' ') files; fonts: $(ls public/fonts | wc -l | tr -d ' '); background: public/table/table-bg.jpg"

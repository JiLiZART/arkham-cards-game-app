#!/usr/bin/env bash
# Copy the icon set and table art from inspired/ into public/ (run once; outputs are committed).
# Needs: ImageMagick (magick), node.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=inspired/icons
AC_ASSETS=inspired/ArkhamCards/assets
OUT=public/icons
mkdir -p "$OUT" public/table

# target name  ←  source file
# skills, classes, chaos tokens and slots come from the icon fonts; only physical token art is copied
rm -f "$OUT"/*.png
while read -r dst src; do
  cp "$SRC/$src" "$OUT/$dst.png"
done <<'MAP'
damage damage-token-one.png
damage-3 damage-token-three.png
horror horror-token.png
horror-3 horror-token-three.png
clue evidence-coin.png
clue-3 token-clue-trhee.png
doom doom-token.png
doom-3 token-doom-three.png
resource resource-one.png
resource-3 token-resource-3.png
resource-5 token-resource-5.png
lead token-lead-player.png
connector-both connector-both-ways.png
connector-one-way connector-one-way-from-left-to-right.png
MAP
cp inspired/chaos-bag.png "$OUT/chaos-bag.png"
# tokens and plaques come on an opaque white box: flood the corners transparent
for c in connector-both connector-one-way damage damage-3 horror horror-3 clue clue-3 doom doom-3 resource resource-3 resource-5 lead; do
  magick "$OUT/$c.png" -alpha set -fuzz 12% -fill none -draw "color 0,0 floodfill" -draw "color %[fx:w-1],0 floodfill" -draw "color 0,%[fx:h-1] floodfill" -draw "color %[fx:w-1],%[fx:h-1] floodfill" "$OUT/$c.png"
done

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

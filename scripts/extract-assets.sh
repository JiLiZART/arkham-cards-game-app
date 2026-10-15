#!/usr/bin/env bash
# Copy the icon set and table art from inspired/ into public/ (run once; outputs are committed).
# Needs: ImageMagick (magick), node.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=inspired/icons
OUT=public/icons
mkdir -p "$OUT" public/table

# target name  ←  source file
while read -r dst src; do
  cp "$SRC/$src" "$OUT/$dst.png"
done <<'MAP'
willpower willpower.png
intellect intellect.png
combat combat.png
agility agility.png
wild wild.png
guardian class-guardian.png
seeker class-seeker.png
rogue class-rogue.png
mystic class-mystic.png
survivor class-survivor.png
damage damage-token-one.png
damage-3 damage-token-three.png
horror horror-token.png
horror-3 horror-token-three.png
clue evidence-coin.png
doom doom-token.png
resource resource-one.png
skull token-skull.png
cultist token-cultist.png
tablet token-tablet.png
elderThing token-elder-thing.png
elderSign token-elder-sign.png
autoFail token-autofail.png
plus-one chaos-token-plus-one.png
minus-one chaos-token-minus-one.png
slot-hand slot-hand.png
slot-hands slot-hands.png
slot-arcane slot-arcane.png
slot-arcane-2 slot-arcane-two.png
slot-accessory slot-accessory.png
slot-body slot-body.png
slot-ally slot-ally.png
resource-1 token-resource-1.png
resource-3 token-resource-3.png
resource-5 token-resource-5.png
clue-3 token-clue-trhee.png
doom-3 token-doom-three.png
lead token-lead-player.png
card-back card-back-bg.png
connector-both connector-both-ways.png
connector-one-way connector-one-way-from-left-to-right.png
MAP
cp inspired/chaos-bag.png "$OUT/chaos-bag.png"
# the connector plaques come on an opaque white box: flood the corners transparent
for c in connector-both connector-one-way; do
  magick "$OUT/$c.png" -alpha set -fuzz 12% -fill none -draw "color 0,0 floodfill" -draw "color %[fx:w-1],0 floodfill" -draw "color 0,%[fx:h-1] floodfill" -draw "color %[fx:w-1],%[fx:h-1] floodfill" "$OUT/$c.png"
done

# the play-area background with its green frame
magick inspired/icons/table-bg.png -quality 82 public/table/table-bg.jpg

# ArkhamCards fonts: icon fonts (IcoMoon) and card fonts
AC=inspired/ArkhamCards/assets
mkdir -p public/fonts
for f in arkhamicons.ttf tokens.ttf Teutonic.ttf "Teutonic RU.ttf" Alegreya-Regular.ttf Alegreya-Bold.ttf Alegreya-Italic.ttf; do
  cp "$AC/$f" "public/fonts/${f// /-}"
done
# glyph name → code point, from the IcoMoon selection configs (so components never hard-code code points)
node -e '
const fs = require("fs");
const read = (f) => Object.fromEntries(JSON.parse(fs.readFileSync(f, "utf8")).icons.map((i) => [i.properties.name, i.properties.code]));
const out = { arkhamicons: read(process.argv[1]), tokens: read(process.argv[2]) };
fs.writeFileSync("src/ui/glyphs.generated.json", JSON.stringify(out, null, 1) + "\n");
' "$AC/arkhamicons-config.json" "$AC/tokens.json"
echo "icons: $(ls $OUT | wc -l | tr -d ' ') files; fonts: $(ls public/fonts | wc -l | tr -d ' '); background: public/table/table-bg.jpg"

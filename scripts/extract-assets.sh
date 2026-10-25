#!/usr/bin/env bash
# Copy the cardboard token art and table art from inspired/ into public/ (run once; outputs are committed).
# Every other icon is a symbol of the sprite built by scripts/import-icons.ts.
# Needs: ImageMagick (magick).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=inspired/icons
AC_ASSETS=inspired/ArkhamCards/assets
OUT=public/icons
mkdir -p "$OUT" public/table

# target name  ←  source file
# only the cardboard tokens are copied: damage, horror, doom, clues and resources (with their 3 and 5 stacks), lead, the connector plaques.
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
clue evidence-coin.png
clue-3 token-clue-trhee.png
resource resource-one.png
resource-3 token-resource-3.png
resource-5 token-resource-5.png
lead token-lead-player.png
connector-both connector-both-ways.png
connector-one-way connector-one-way-from-left-to-right.png
MAP
rm -rf "$TMP"

# the painted chaos bag (already on a transparent background)
cp inspired/icons/no_bg_chaos-bag.png "$OUT/chaos-bag.png"

# card backs from ArkhamCards, mapped by their art: its file names are swapped relative to the printed game
# (encounter-back.png is the sepia tentacle player back, player-back.png the blue eclipse encounter back)
magick "$AC_ASSETS/encounter-back.png" \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 %[fx:w-1],%[fx:h-1] 34,34" \) -alpha off -compose CopyOpacity -composite public/table/back-player.png
cp "$AC_ASSETS/player-back.png" public/table/back-encounter.png

# the play-area background: a night-teal baize drawn here (no source art), framed by two bone hairlines
W=2275 H=1495 T=$(mktemp -d)
magick -seed 7 -size ${W}x${H} plasma:fractal -colorspace gray -blur 0x60 -auto-level "$T/cloud.png"
magick -seed 11 -size ${W}x${H} xc:gray50 +noise Gaussian -colorspace gray -motion-blur 0x2+30 -motion-blur 0x2-60 -auto-level "$T/fiber.png"
magick -size ${W}x${H} radial-gradient:white-black -evaluate pow 0.35 "$T/vig.png"
magick "$T/cloud.png" \( "$T/fiber.png" -level 20%,80% \) -compose blend -define compose:args=28 -composite \
  "$T/vig.png" -compose multiply -composite -level 10%,100% +level-colors '#081316','#24464a' \
  -fill none -stroke '#c9c6b85a' -strokewidth 2 -draw "roundrectangle 46,46 $((W - 47)),$((H - 47)) 14,14" \
  -stroke '#c9c6b82a' -strokewidth 1 -draw "roundrectangle 57,57 $((W - 58)),$((H - 58)) 10,10" \
  -quality 84 public/table/table-bg.jpg
rm -r "$T"

# ArkhamCards card fonts, copied as they are (icons come from the sprite, scripts/import-icons.ts)
AC=inspired/ArkhamCards/assets
mkdir -p public/fonts
# plus the fonts the campaign guides' markup asks for: Caveat (<fancy>) and TT2020 Style E (<typewriter>), both SIL OFL; see public/fonts/LICENSES.md
# (About Dead, which ArkhamCards uses for <innsmouth>, is "all rights reserved": not copied, Teutonic stands in)
for f in Teutonic.ttf "Teutonic RU.ttf" Alegreya-Regular.ttf Alegreya-Bold.ttf Alegreya-Italic.ttf Caveat.ttf TT2020StyleE-Regular.ttf; do
  cp "$AC/$f" "public/fonts/${f// /-}"
done
echo "icons: $(ls $OUT | wc -l | tr -d ' ') files; fonts: $(ls public/fonts | wc -l | tr -d ' '); background: public/table/table-bg.jpg"

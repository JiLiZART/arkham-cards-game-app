#!/usr/bin/env bash
# Copy the icon set and table art from inspired/ into public/ (run once; outputs are committed).
# Needs: poppler (pdfimages), ImageMagick (magick).
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
MAP

# the Learn to Play play-area spread (page 4, first image): parchment with a faint pentagram
TMP=$(mktemp -d)
pdfimages -f 4 -l 4 -png inspired/AHC01_Learn_to_Play_RU_2020_1.pdf "$TMP/p"
magick "$TMP/p-000.png" -resize 2048x -quality 82 public/table/parchment.jpg
rm -rf "$TMP"
echo "icons: $(ls $OUT | wc -l | tr -d ' ') files; background: public/table/parchment.jpg"

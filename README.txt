MUJI CD Player Prototype

Open this folder in Cursor, then run with Live Server.

To make it match Figma exactly:
1. Replace assets/muji-home-bg.png with your exact exported mobile frame PNG.
2. Export each CD design from Figma as a transparent PNG:
   assets/cd-france.png
   assets/cd-spain.png
   assets/cd-italy.png
   assets/cd-ireland.png
   assets/cd-scotland.png
3. In script.js, replace each cd bg value with: url('assets/cd-france.png') etc.

The background is static. Only the small player, expanded modal, CD, controls, and audio are interactive.

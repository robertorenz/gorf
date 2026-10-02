# GORF: Reimagined

A 2.5D browser remake of the 1981 arcade game *Gorf*. Gameplay stays on a flat plane like the original; everything is drawn as extruded voxel models through a tilted perspective camera, over a scrolling deck grid and starfield.

## Play

Open `index.html` in a browser. No build step and no server needed (Three.js is vendored in `vendor/`).

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Move (the fighter can roam the lower part of the field) |
| Space | Fire the quark laser. Only one bolt exists; firing again recalls it |
| P / Esc | Pause |
| M | Mute sound and speech |
| Touch / mouse | Drag to steer, press to fire |

## Missions

1. **Astro Battles** – a marching invader block. A force-field dome absorbs enemy fire and opens when you shoot.
2. **Laser Attack** – two squads, each guarding a laser ship that telegraphs, then fires a full-height beam.
3. **Galaxians** – a swaying convoy that peels off to dive-bomb. Divers are worth double.
4. **Space Warp** – enemies spiral out of a warp tunnel, growing as they approach.
5. **Flag Ship** – break the force field, then chip through the hull or thread the vent to hit the reactor.

Clearing all five promotes you (Space Cadet → Captain → Colonel → General → Warrior → Avenger), awards a bonus ship, and speeds everything up. Gorf taunts you through the browser's speech synthesis.

## Layout

- `index.html` – page, HUD and modals
- `css/style.css` – styling
- `js/game.js` – the whole game: renderer, voxel sprites, audio, missions
- `vendor/three.min.js` – Three.js r128

This is an unofficial fan tribute; *Gorf* is the property of its respective owners.

# GORF: Reimagined

A browser remake of the 1981 arcade game *Gorf*, with two cabinets to choose from at the start:

- **Reimagined** – a 2.5D version. Gameplay stays on a flat plane like the original; everything is drawn as extruded voxel models through a tilted perspective camera, over a scrolling deck grid and starfield.
- **Original** – a recreation of the arcade game as it looked in 1981: flat pixel sprites on a black portrait screen, the arcade score layout, attract mode and all five missions. Sprites are drawn pixel by pixel at the browser's full resolution, so it stays sharp on any screen instead of being an upscaled low-res image.

**Play it now: https://robertorenz.github.io/gorf/**

## Play

Or run it locally: open `index.html` in a browser. No build step and no server needed (Three.js is vendored in `vendor/`).

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Move (the fighter can roam the lower part of the field) |
| Space | Fire the quark laser. Only one bolt exists; firing again recalls it |
| P / Esc | Pause |
| M | Mute sound and speech |
| Touch / mouse | Drag to steer, press to fire |

### Original mode controls

| Input | Action |
| --- | --- |
| Space / Enter | Start from the attract screen |
| Arrow keys / WASD | Move |
| Space | Fire (firing again recalls the shot) |
| P | Pause |
| M | Mute |
| Esc | Back to the main menu |

Original mode keeps its own high score and awards a bonus ship every 10,000 points.

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
- `js/game.js` – the Reimagined game (renderer, voxel sprites, audio, missions) and the menu wiring
- `js/classic.js` – the Original arcade mode, drawn on its own 2D canvas
- `vendor/three.min.js` – Three.js r128

## About the original

*Gorf* is an arcade game released by Midway in 1981, designed and programmed by Jamie Fenton. The name is commonly said to stand for "Galactic Orbiting Robot Force".

- It was one of the first arcade games built from several distinct missions, each with its own rules, rather than one repeating screen.
- It talked. A Votrax speech synthesizer let the Gorfian robot taunt players by rank ("Bad move, Space Cadet!"), which this remake echoes with the browser's speech synthesis.
- Two missions borrowed from other hits: Astro Battles is modelled on Taito's *Space Invaders*, and the Galaxians mission was licensed from Namco's *Galaxian*. Most home versions dropped the Galaxians mission for that licensing reason.
- The player's "quark laser" fires a single bolt that can be recalled by firing again, and the ship can move vertically as well as sideways. Both are kept here.
- Completing all five missions promotes the player through six ranks, from Space Cadet to Space Avenger.

## Credits

- **Original game:** *Gorf* (1981), Midway Mfg. Co. Design and programming by Jamie Fenton.
- **Space Invaders** by Taito and **Galaxian** by Namco, which inspired two of the original's missions.
- **This remake:** Roberto Renz, built with [Claude Code](https://claude.com/claude-code). All code, voxel models and sounds were written from scratch; no original ROM data, graphics or audio are used.
- **[Three.js](https://threejs.org/)** (MIT License) for rendering.

## License

The code of this remake is released under the [MIT License](LICENSE).

This is an unofficial, non-commercial fan tribute. It is not affiliated with or endorsed by the rights holders. *Gorf*, *Space Invaders* and *Galaxian* are trademarks of their respective owners, and the MIT License here covers only this project's own code, not those names or properties.

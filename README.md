# Hormuz Run

Steer a slow, heavy container ship through the Strait of Hormuz while the US Navy and Iran fight around you. Dodge artillery, crossfire missiles, homing missiles, mines and fast boats, and get your cargo to the Gulf of Oman.

**Play:** https://khiemngs.github.io/hormuz-run/

## Controls

| Key | Action |
| --- | --- |
| `W` / `S` | Throttle |
| `A` / `D` | Rudder |
| `Space` | Flares (decoy homing missiles) |
| `H` | Horn (scares off fast boats) |
| `P` / `Esc` | Pause |
| `M` | Mute / unmute audio (also the 🔊 button) |
| `` ` `` | Toggle tech panel |

On phones and tablets the game shows on-screen buttons instead: ◀ ▶ rudder, ▲ ▼ throttle, 🎆 flares, 📯 horn, ⏸ pause. It plays in portrait or landscape.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # serve the production build
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Project structure

```
src/
  main.js              entry point and frame loop
  config.js            tuning constants (track length, fog, sun)
  input.js             keyboard handling
  core/engine.js       renderer, scene, camera, lights, resize
  world/
    geography.js       lane width, wave height, terrain height
    sky.js, water.js   shader sky dome and ocean
    coast.js           coastlines, buoys, finish gate
    index.js           builds the world and keeps it centred on the ship
  models/
    build.js           model toolkit: hull lofting, painted parts, geometry merging
    ...                ship, navy, props, ordnance, each merged into one mesh
  fx/
    Particles.js       particle system simulated in the vertex shader
    effects.js         explosions, muzzle flashes, trails
  audio/sfx.js         WebAudio synthesized sound
  game/
    state.js           shared mutable state (G)
    session.js         reset, start, win, end of run
    ship.js            player handling and damage
    cargo.js           containers and overboard debris, one instanced mesh
    navy.js            US destroyers and Iranian batteries
    director.js        attack scheduling, ceasefire/escalation events
    threats/           artillery, missiles, fast boats
    hazards.js         mines and pickups
    abilities.js       flares and horn
    camera.js          chase and menu cameras
    radioLines.js      radio chatter
  ui/
    hud.js             HUD, banners, radio, score popups
    screens.js         menu and end screens
    techPanel.js       FPS, draw calls, vertices, game stats
  styles/main.css
  utils/               math, DOM, storage, canvas textures
```

## Tech

- [Three.js](https://threejs.org/) for rendering; every model is built in code, with no asset files
- [Vite](https://vitejs.dev/) for dev server and bundling
- Custom GLSL for the water, sky and particles

## Performance notes

- Repeated objects (containers, mines, batteries, destroyers, buoys) are instanced, and each model is a single merged mesh, so a busy frame is about 40 draw calls.
- Particles are simulated on the GPU. The CPU writes a particle once at spawn and uploads only that slice of the buffer.
- The water mesh is dense near the ship and coarse toward the horizon. Its shading is computed per pixel from the wave equations, so it stays smooth at any mesh density.
- The coast is split into chunks that are culled when out of view, and the far plane sits just past full fog.
- HUD text refreshes 10 times a second rather than every frame.

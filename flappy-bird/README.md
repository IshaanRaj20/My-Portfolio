# ⚡ Neon Flappy Bird: Cyberpunk Edition

A high-octane, modern cyberpunk reimagining of the classic Flappy Bird formula, rendered in neon vector graphics and styled with reactive visual feedback. Fly through tight neon corridors, harvest high-tier active power-ups, and customize your energy signatures using persistent achievements and local ranking databases.

---

## 🕹️ Game Features

*   **Four Core Difficulties**:
    *   🟢 **Easy**: Gentle horizontal velocities with wide, forgiving clearances.
    *   🟡 **Normal**: Moderate pace; standard physics and classic arcade spacing.
    *   🔴 **Hard**: Fast grid scrolling with extremely demanding clearances.
    *   💀 **Insane**: A near-impossible, hyper-speed corridor. Requires razor-sharp reflexes.
*   **🛠️ Physics Sandbox Simulator**:
    *   A zero-obstacle, collision-free play-chamber dedicated to physics exploration and micro-adjustments.
    *   **Telemetry Core Panel**: A high-tech overlay displaying real-time metrics including Grid Speed, Altitude, Thrust vector Force ($V_y$), Total Flaps, and Bird Spatial Coordinates.
    *   **On-the-Fly Physics Sliders**: Tune variables dynamically without resetting your run:
        *   **Propulsion Speed** ($0.5\text{ M/S} - 10.0\text{ M/S}$)
        *   **Gravity Coefficient** ($0.05\text{ G} - 1.20\text{ G}$)
        *   **Flap Impulse Thrust** ($2.0\text{ N} - 12.0\text{ N}$)
        *   **Airframe Footprint Dimension** ($8\text{px} - 32\text{px}$) --- scales the physical collision box and visual bird silhouette dynamically!
*   **⚡ Reactive Power-Up Matrix**:
    *   🧿 **Shield**: Nullifies the next collision impact.
    *   🌀 **Slow-Motion**: Dilates time to $65\%$ speed, easing tight gaps.
    *   🧪 **Nano Comp (Shrink)**: Contracts your bird's physical footprint by $50\%$ to slip through micro-openings.
    *   💥 **Blaster**: Launches light pulses that clear upcoming neon pipes.
*   **🎨 Custom Energy Skins**: Unlock vibrant cyberpunk aesthetic skins using your high scores and in-game achievement criteria. Each carries a custom motion trail profile.

---

## 🎮 How to Play & Controls

| Input | Action |
| :--- | :--- |
| **`SPACE` / `UP ARROW` / Click** | **Thrust / Flap** (Propels the bird upwards) |
| **`ESC` / Click `SYS PAUSE`** | **Pause / Resume Game** |
| **Sandbox Sliders** | Drag to change gravity, flight impulse, grid speed, or bird size in real-time |

---

## 🔬 Sandbox Physics Explained

The Sandbox mode provides a dedicated play-chamber designed for tuning aircraft physics. The relationship between your modifications and the core simulation includes:

1.  **Gravity Co-efficient**: Dictates the downward acceleration of your bird on every frame. Higher values pull the bird down rapidly, mimicking high-pressure worlds.
2.  **Flap Impulse (Thrust)**: Represents the immediate upward force velocity vector counteracting gravity. An elevated impulse results in high-altitude bursts, whereas a fine impulse provides shallow, hover-like controls.
3.  **Propulsion Speed**: Controls the scroll rate of the grid background, representing the speed of horizontal movement.
4.  **Airframe Footprint**: Instantly resizes the physics circle and visually matches the bird avatar radius on-screen. A smaller footprint is highly responsive, whereas a full $32\text{px}$ footprint tests heavy flight physics.

---

## 🛠️ Technology Stack

*   **Frontend Framework**: React 18, Vite (Fast module delivery)
*   **Core UI Theme**: Tailwind CSS (Cyan / Emerald / Amethyst custom theme parameters)
*   **Animation System**: Framer Motion (`motion/react`)
*   **Audio Engine**: Web Audio API Synthesizer (Generates rich, synthesized flight sweeps, power-ups, blaster pulses, and impact crunches directly in code with zero external asset overhead)
*   **Database Infrastructure**: Autosaving Local Browser Store (Keeps achievements, custom skin setups, and high-scores persistent)

---

## 🌌 Aesthetics & Inspiration

This application visualizes standard physical mechanics through the glowing grids of neon vectors. Styled with generous negative space, sleek translucent panels, high-contrast dashboard telemetries, and dark cosmic backdrops. Perfect for benchmarking arcade responses and customized physics simulators!

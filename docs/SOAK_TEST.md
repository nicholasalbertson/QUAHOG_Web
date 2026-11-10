# Soak test — The Narrows photoreal build

This is the manual test the owner runs with a real Map Tiles API key. The cloud agent cannot do it: there is no key in the repo, and a unit test of the rebase is not a drive on real tiles.

Do it twice. Once on a mid-range laptop (integrated graphics is the interesting case). Once on a phone, Safari on iPhone if you have one, Chrome on Android otherwise. Same key, restricted to the origin you are actually loading.

## Before you start

1. Confirm the key has **Map Tiles API** enabled and billing on. Read the current [Map Tiles API terms](https://developers.google.com/maps/documentation/tile) before you treat a long soak as allowed use. A soak spends quota.
2. Do not put the key in the repo, a screenshot, or a bug report. On the live host the page reads it from the environment (`ENV.md`). For a local soak, a gitignored `.env.local` with `VITE_GOOGLE_MAP_TILES_KEY`, or the paste box, is enough. It must not stay in the address bar.
3. Open `earth.html` on the build you want to judge. Production deploys stay manual; this script does not deploy anything.
4. Leave the performance line on (it is on by default, bottom-left). Note the tier: high, medium, or low.

## Laptop — about twenty minutes

1. New drive. You should be on a street at The Narrows, not inside a building. The objective mentions the Quequechan.
2. Wait until the mesh is under your feet. If the fault banner stays up, the key or the quota is the problem, not the rebase. Dismiss it only if you are testing the fallback ground on purpose.
3. Walk to the car. Enter it. Drive east. Stay on local streets until the ground is solid, then get on I-195 east toward New Bedford.
4. Watch the performance line while you cross the bridge and the highway. The tier may step from high to medium. It should not fall to a frozen tab. The rebase count should climb (about one per 1.8 km). The car should not jump to an empty coordinate or fall through the world for more than a frame.
5. Keep going until the location line says a New Bedford street or Seamen's Bethel is the nearest place. Park. Open the map and confirm the pink arrow is on New Bedford, not back in Fall River.
6. Save from the pause menu. Reload the page. Continue. You should be on the same stretch of road, not at the city pin you started from.
7. Punch a pedestrian or ram a car so a star appears. A cruiser should show up. At three stars, one of them should sit across the road ahead instead of only chasing in a straight line. Lose them by staying clean, or get busted and confirm you still have the car and a cut of cash is gone.
8. Stop with some body damage (the HUD shows it after a hard hit). Hold R while stopped and pay the repair. The car should pull again.
9. Open pause → Jobs and start a side job in another region. You only need to confirm the objective and the distance change when you drive toward it. You do not have to finish the Cape.
10. Hide the tab for thirty seconds, then come back. Tiles should not have kept downloading the whole time, and the scene should resume.
11. If the GPU context drops, the amber "Graphics paused" line should appear and clear without a manual reload. If it stays for several seconds, use the reload button on that notice and confirm Continue still works.

Write down: machine, browser, the tier you settled on, the highest rebase count, whether the ground disappeared, and whether reload resumed the highway pose.

## Phone — shorter, the memory case

1. Same key flow. Rotate to landscape if the browser allows it.
2. New drive, enter the car, drive for ten minutes along I-195. The tier should be medium or low. Low is a success if the ground stays and the frame rate is even. High on a phone that then crashes is not.
3. Lock the phone for a minute. Unlock. The scene should resume or show the graphics-paused line and recover.
4. Save, kill the browser, reopen, Continue. Same pose.
5. Open pause and confirm the buttons can be tapped. Gamepad is not part of the phone pass.

Stop if the page reloads itself, the car falls through the mesh and does not come back, or the browser offers to close the tab for memory. That is a failed soak. Note the rebase count at the failure.

The human items that sit next to this soak are in `docs/RELEASE_CHECKLIST.md`.

## What this does not sign off

Art, voice, the vehicle-pack license, store listing, and a production tag. Those are in `docs/RELEASE_CHECKLIST.md`.

# Legal — audio / voice (§ RELEASE Legal)

## Procedural & original

| Source | Status | Notes |
|--------|--------|-------|
| Web Audio synth beds (`radioEngine.ts`) | original | No third-party samples |
| Procedural SFX (`sfx.ts`) | original | Oscillator / noise bursts |
| Host talk *scripts* (Rage, Anvil, WHALE, Maré Alta, …) | original | Written for Mount Hope |

## ElevenLabs — pending commercial

ElevenLabs TTS and Music generation used for radio host VO / station beds are
**pending-commercial**. Fine for RC playtests and non-monetized demos; **confirm
commercial entitlement before any paid ship**.

| Asset class | Path / pattern | Status |
|-------------|----------------|--------|
| Station music beds | `public/music/{whale,mare,rage,anvil,…}/**/*.mp3` | pending-commercial |
| Host line VO | `public/music/**/host/**`, `public/music/**/vo/**` | pending-commercial |
| Runtime `/api/tts` | ElevenLabs voices via env keys | pending-commercial |

See also `docs/ASSET-LICENSE-AUDIT.md` and `MUSIC.md`. Do not embed API keys in
the client; keep generation prompts out of the product tree.

## Accept

`npm run assets:audit` covers on-disk binaries. This note is the human decision
record for ElevenLabs commercial clearance before monetization.

# Art direction

The site is a sheet of cream paper with one machine on it. The machine is HARO-PC, a small cat-eared
computer, and every screen on the site is its screen. When something opens on top of the page, a
picture or harogatOS, it is HARO-PC's screen made big, not a modal.

Anything new should be checkable against this page. If a change needs a rule that is not here, add
the rule here in the same PR.

## HARO-PC

The machine exists twice: in 3D in the hero (`src/components/pc-model/haroPC.ts`) and in HTML around
the picture viewer and harogatOS (`CrtLightbox.tsx`, `harogatos/HarogatOS.tsx`). Both have the same
parts, so they read as one object.

| Part | 3D | HTML |
|---|---|---|
| Case | Cream rounded box, ink outline | `bg-background`, `border-4 border-text`, no offset shadow |
| Ears | Two cream triangles with coral insides, leaning out | `CaseEars.tsx`, sitting on the top border |
| Bezel | Ink frame around the glass | `bg-text`, `border-radius: 32px / 40px` |
| Glass | The face canvas, 16x16 cells | `.crt-screen` with scanlines and curve |
| Power light | Coral square, left of the chin | `w-2 h-2 bg-primary`, on the harogatOS chin only |
| Name | "HARO-PC" plate on the chin | "harogatOS" on the OS chin. The viewer chin has only its buttons, so the picture gets the room. |
| Paws, tail | Four paws, a power cord that curls up | None. The HTML case has no underside to show them. |

The favicon (`public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`) is the same machine drawn on
a 32x32 pixel grid: ears, ink outline, the default face, the coral light, paws.

The machine is a cat because the site's handle is harogato and the PC already meows. The ears are
what makes the link between the 3D PC and the windows visible at a glance, so a window without them
is a bug.

When harogatOS opens on a page where the PC is on screen, it grows out of the PC and shrinks back
into it. The picture viewer grows out of the thumbnail you clicked. Either way the window comes from
something on the page.

## Colour

| Role | Value | Used for |
|---|---|---|
| Paper | `#FDF7E7` | The page and the HTML case |
| Case paint | `#FBE9C6` | The 3D case, a shade warmer than the page so it stands off it |
| Ink | `#412C47` | Text, borders, bezels, outlines, hard shadows |
| Coral | `#FD8D75` | One accent per area: the power light, ear insides, the active button, link hover |
| Phosphor | `#FFB000` on `#110800` | Every screen's default: harogatOS, the viewer surround, the 404 |

Other phosphor colours (green, blue, pink) only appear when they mean something. The PC's own faces
change colour with their mood, and visitors pick a colour for the face they draw. A screen with no
reason to be another colour is amber.

No gradients for decoration and no glow halos behind things. Glow belongs to lit phosphor only.

## Type

- Archivo Black (`font-black-han-sans`) for headings and the harogatOS name.
- Ubuntu Mono for anything the machine says: screens, labels, tags, the chin.
- Open Sans for anything people read in full: descriptions, paragraphs.

Inside a screen, capitals are fine, because that is how old terminals talked. Outside a screen,
sentence case.

## Shape

- Hard ink borders and hard offset shadows (`shadow-[4px_4px_0px_0px_...]`), no blur. Windows that
  open over the page get the border only. The dark backdrop already lifts them, and a shadow would
  only take room from the picture.
- Square corners on the page. The only rounded things are the CRT glass and its bezel, because
  glass is curved.
- In 3D, the same idea: flat cel shading in three steps and an ink outline on every solid part.
  Light comes from the upper left, the same direction the page's hard shadows fall from.

## Motion

- CRT effects only play when the machine does something: switching on, switching off, changing
  channel. Never as decoration on something that is just sitting there.
- Short: page changes about 350ms, windows 180 to 280ms, presses 150ms.
- No overshoot and no bounce on interface elements. Ease out on the way in, ease in on the way out.
  The PC itself may bounce when you click it, because that is the PC reacting, not the interface.
- `prefers-reduced-motion` gets plain fades or nothing.

## Sound

Every sound is a retro sound effect made with rFXGen, raylib's sfxr-style generator. No samples,
no meows, no synth code running in the page. The recipes are lines in `sfx/sounds.txt`, and
`npm run sfx` turns them into the WAVs in `public/sfx`. Each one also gets a `.rfx` in `sfx/rfx`
that opens in [rFXGen](https://raylibtech.itch.io/rfxgen), so a sound can be tuned by ear there
and its numbers copied back.

- The house sound is a square wave: short, dry, a little punch. Sine only for the softest one.
- The PC sounds like a PC: a speaker bip when poked, the BIOS self-test beep and a drive seeking
  when it boots, the tone falling away when it shuts down.
- Screens switching on and off (the picture viewer, harogatOS) get a thunk and a falling tone.
- Games may be louder and more musical. Stacker climbs a semitone per row by playing one sound
  faster, not by having sixteen of them.
- A hover is not a press. Nothing plays until the visitor has clicked, tapped or typed.

## Voice

Short and plain, first person where it fits. The machine's lines on a screen can be terse and a
little dry ("NO SIGNAL", "SEEK ERROR 404"). No marketing words, no exclamation marks outside the
games.

## Not this

These are the things that make a site look generated, and the reasons they are out here:

- A fake BIOS, fake desktop or fake OS chrome for its own sake. harogatOS is a game window, not a
  desktop simulator.
- Neon green on black, glowing text, radial halos behind windows.
- A blinking cursor on text you cannot type into, outside a screen.
- Pulsing dots, bouncing buttons, things that move while nothing is happening.
- Hidden ways in as the only way in. Every easter egg has a visible button too.
- A modal that does not come from anything on the page.

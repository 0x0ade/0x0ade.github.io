# Crappy Everest level term definition list
AKA: The document ade tried to write while Cruor interrupted him multiple times.

For an up-to-date list of meta properties, check [the MapMeta source](https://github.com/EverestAPI/Everest/blob/master/Celeste.Mod.mm/Mod/Meta/MapMeta.cs).

**If you just care about what contains what:**
- **Levelset** "contains" **chapters**.
- **Chapter** contains chapter info (name, icon, interlude, cassette info, intro type) and **modes** (sides)
- **Modes** are your actual **.bin maps** + inventory, audio data, checkpoints
- We read **chapter info and mode list from A-side `MapMeta` .meta**
- Map .bins that are part of another .meta's mode don't show up as their own chapter.

---

- ### Levelset:
  - **Meta type: none**
  - **Collection of chapters.**
  - The levelset of a chapter with SID `Cruor/Secret/1-Secret` is `Cruor/Secret`
  - Switching in chapter selection using the menu up / down inputs.
  - Dialog key for the name is just the levelset name escaped (`_` instead of `/`, `-`)
  - **Doesn't contain any properties by itself.**

- ### Chapter:
  - **Meta type: `MapMeta`**
    - One .meta for each A-side .bin of each chapter.
  - **A single entry in the chapter select screen.**
  - _AKA "area" (in code), "level" (technically wrong)_
  - _Example:_ Prologue
  - Switching in chapter selection using the menu left / right inputs.
  - Contains a `string SID` **(String ID)**. Vanilla Celeste code sets integer ID = index in `AreaData.Areas`
  - Additionally contains the following other properties:
    - `string Name, Icon` - Dialog key and path to the icon in the Gui atlas. `"areas/secret"` points to `Graphics/Atlases/Gui/areas/secret.png`
    - `string CompleteScreenName` - Name of a vanilla "completion" screen. For custom screens, use `CompleteScreen` instead.
    - `string TitleBaseColor, TitleAccentColor, TitleTextColor` - Hexadecimal colors, f.e. `"6c7c81"`
    - `Player.IntroTypes IntroType` - One of the following:
      - `Transition` (broken!)
      - `Respawn`
      - `WalkInRight`
      - `WalkInLeft`
      - `Jump`
      - `WakeUp` (default)
      - `Fall`
      - `TempleMirrorVoid`
      - `None`
      - **One intro type per chapter, not per mode (side).**
    - `string ColorGrade` - Game uses `"oldsite"` and `"reflection"`. (Note: I don't remember adding custom color grading support...)
    - `string Wipe` - **Currently ignored.** Will be the full type name of the wipe to be constructed, f.e. `"Celeste.AngledWipe"`. Use runtime mods to provide custom wipe types.
    - `string CassetteNoteColor` - Hexadecimal color
    - `string CassetteSong` - **We don't support custom songs.** One of the following:
      - `"event:/music/cassette/01_forsaken_city"`
      - `"event:/music/cassette/02_old_site"`
      - `"event:/music/cassette/03_resort"`
      - `"event:/music/cassette/04_cliffside"`
      - `"event:/music/cassette/05_mirror_temple"`
      - `"event:/music/cassette/06_reflection"`
      - `"event:/music/cassette/07_summit"`
      - `"event:/music/cassette/09_core"`
    - `MapMetaModeProperties[] Modes` - All modes ("sides") for this chapter and the reason why _only_ the A-side .bins should have a .meta
    - `MapMetaMountain Mountain` - Mountain cameras (`MapMetaMountainCamera Idle, Select, Zoom` with `float[2] Position, Target`), `float[2] Cursor` and `int State` (0 - 2)
    - `MapMetaCompleteScreen CompleteScreen` - Check [the class source.](https://github.com/EverestAPI/Everest/blob/master/Celeste.Mod.mm/Mod/Meta/MapMetaCompleteScreen.cs)

- ### Mode:
  - **Meta type: `MapMetaModeProperties`**
    - Chapter / A-side .meta contains multiple modes
  - _AKA "side"_
  - First mode is A-side, second mode is B-side, third mode is C-side.
  - Most important property: `string Path` - `"Cruor-Secret"` points to `Maps/Cruor-Secret.bin`
  - If a mode refers to a non-A-side .bin, it won't appear as its own chapter.
    - Example: You've got `1-Cruor-Secret.bin`, `1-Cruor-Secret.meta.yaml` and `1-Cruor-Secret-B.bin`. You then set the first mode's path to `1-Cruor-Secret` and the second mode's path to `1-Cruor-Secret-B`. `1-Cruor-Secret` and `1-Cruor-Secret-B` are now **modes** of the **chapter (multiple sides)**. The **chapter with a SID** is part of a **levelset (multiple chapters)**.

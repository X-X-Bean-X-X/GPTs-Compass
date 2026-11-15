# GTP's Compass by X_Bean_X

See map north and your camera heading in Cities: Skylines II. Keep the compass hovering over the map or anchor it to the toolbar.

- [Paradox Mods](https://mods.paradoxplaza.com/mods/167813/Windows)
- [v1.0.0 Windows ZIP](https://github.com/X-X-Bean-X-X/GTPsCompass/releases/download/v1.0.0/GTPCompass-1.0.0-Windows.zip) for game version 1.6.4f1
- [Controls and options](Mod%20Description.md)
- [Ten compass styles](Artwork/CompassStyles.png) and the [Brass on Chicago cover](Artwork/Thumbnail.png)

## Install

Subscribe on Paradox Mods, or extract every file from the Windows ZIP into a `GTPCompass` subfolder of your local Cities: Skylines II `Mods` directory. Click the compass to open its menu, or find **GPT's Compass** in the game’s Options.

## Build from source

Install the Cities: Skylines II modding toolchain and Roslyn. Run `./Build.ps1` in PowerShell from the repository root.

| Environment variable | Build.ps1 parameter | Path |
| --- | --- | --- |
| `CSII_MANAGEDPATH` | `-ManagedDirectory` | Game managed assemblies directory |
| `CSC_PATH` | `-Compiler` | Roslyn `csc.exe` |
| `CSII_MODPOSTPROCESSORPATH` | `-PostProcessor` | CS2 mod postprocessor executable |
| `CSII_UNITYMODPROJECTPATH` | `-UnityModProject` | Toolchain Unity mod project directory |

Use `-CompileOnly` to compile the managed assembly. The full build creates `build/GTPCompass-1.0.0-Windows.zip`.

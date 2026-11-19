# Walk-view splats

Each `.splat` file here is a Gaussian-splat reconstruction of a published, excavated site, trained from visitors' photographs. It is a picture built from those photographs, not a survey: anything the photographs did not see is missing or guessed.

| File | Site | Trained on | Credits |
| --- | --- | --- | --- |
| `gobekli-tepe.splat` | Göbekli Tepe, the main excavation area under its shelter | 41 photographs from Wikimedia Commons | `gobekli-tepe.credits.json` |
| `karahan-tepe.splat` | Karahan Tepe, a fragment around Structure AB | 17 photographs from Wikimedia Commons and Flickr | `karahan-tepe.credits.json` |

## Licence

The splats are adaptations of the photographs listed in the credits files. Most of those photographs are licensed CC BY-SA 4.0; the rest are CC BY or in the public domain. The splats are therefore licensed under [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/).

If you share or adapt a splat, keep its credits file with it, credit the photographers it names, say that you changed it if you did, and license your version under the same terms.

Each credits file gives, for every photograph: its title, author, licence, licence address and source page.

## How they were made

Photographs, then camera positions with COLMAP, then training with Brush, then conversion to the 32-byte `.splat` format. The steps and settings are in [`scripts/splat/README.md`](../../../../scripts/splat/README.md). The photographs and training files are not in this repository.

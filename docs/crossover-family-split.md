# Crossover Fellows and Family

The owner decided (2026-09-17): only women may join as **Family**, and about **30** of the 163 crossover
characters should, leaving **133 Fellows**. Of the 163, 57 are women (38 Marvel, 19 Star Wars), so this is
roughly half of them; the original game likewise has women on both sides (159 Fellows / 107 Family).

Family in Everkai is the relationship-and-support track: gifts, dates, intimacy, Fathoms, blessings that
buff Fellows, school caretaking and family trips. Fellows work businesses, join the adventure party and
use artifacts, skills and the mine. So the split is by role, not by rank.

## Rules used to choose

1. **Village-life fit.** Family are characters a village partner role suits; combat-forward characters
   stay Fellows.
2. **One person, one relationship.** Where the roster holds the same person twice, only one entry may be
   Family: **Jean Grey** is Family and **Phoenix** stays a Fellow; **both** Sabine Wren entries stay
   Fellows.
3. **Adults only.** Characters written as teenagers are never Family: Ms. Marvel (Kamala Khan), America
   Chavez, Jubilee, Nico Minoru, X-23 and Padawan Sabine Wren all stay Fellows.
4. **Both franchises represented**, in proportion to how many women each contributes: 20 Marvel, 10 Star
   Wars.

## The 30 (for the owner to amend)

Marvel (20): Invisible Woman, Emma Frost, Agatha Harkness, Sersi, Scarlet Witch, Jean Grey, Storm,
Medusa, Jessica Jones, Sharon Carter, Maria Hill, Mockingbird, Black Cat, Mystique, Morgan Le Fay,
Kitty Pryde, Psylocke, Captain Carter, Thena, Dagger.

Star Wars (10): Padmé Amidala, Leia Organa, Mon Mothma, Luminara Unduli, Satele Shan, Bastila Shan,
Barriss Offee, Mara Jade, Aayla Secura, Cara Dune.

Women who stay Fellows (27): Phoenix, Captain Marvel, Black Widow, Gamora, Rogue, Ms. Marvel, She-Hulk,
Hela, Jubilee, Ghost-Spider, America Chavez, Kate Bishop, X-23, Magik, Mantis, Nebula, Yelena Belova,
Nico Minoru, Ahsoka Tano, Rey, Bo-Katan, Darth Traya, Asajj Ventress, General Syndulla, Sabine Wren,
Jyn Erso, Padawan Sabine Wren.

## What this adds to the work

Family do not use the Fellow plan: their progression is intimacy, Blessing Points, blessing power and
relationship level, not levels, skills and Insight. Before building, the Family side needs its own
measured pass over `lib/blessings.mjs`, `lib/dating.mjs`, `lib/bonds.mjs`, `lib/fathoms.mjs`,
`lib/family-trips.mjs`, `lib/family-gallery.mjs` and `lib/school.mjs` (caretakers), answering:

- what a new Family member needs in data, and whether a template borrowed from an original Family member
  works the way `sourceId()` already does for Fellows;
- whether crossover Family blessings may buff original Fellows, and what that does to the Power ceiling
  the owner accepted (~4x);
- what the Family gallery, dates and trips show for a character with one look and no original scenes;
- which collection totals and achievements would shift for a save mid-play, and how the flag keeps them
  unchanged when it is off.

from pathlib import Path
import shutil
from _workspace import WORK
app=Path(__file__).resolve().parents[1]
shutil.copyfile(WORK/'isekai-research/notes/default-talent-source.json',app/'lib/default-talent-source.json')

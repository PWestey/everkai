from pathlib import Path
import shutil
from _workspace import WORK
app=Path(__file__).resolve().parents[1]
shutil.copyfile(WORK/'isekai-research/notes/special-blessing-data.json',app/'lib/special-blessing-data.json')

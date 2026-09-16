from pathlib import Path
import shutil
from _workspace import WORK
app=Path(__file__).resolve().parents[1]
shutil.copyfile(WORK/'isekai-research/notes/family-blessing-data.json',app/'lib/original-blessing-data.json')

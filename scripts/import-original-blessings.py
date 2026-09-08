from pathlib import Path
import shutil
app=Path(__file__).resolve().parents[1]
shutil.copyfile(app.parent/'isekai-research/notes/family-blessing-data.json',app/'lib/original-blessing-data.json')

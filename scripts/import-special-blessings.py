from pathlib import Path
import shutil
app=Path(__file__).resolve().parents[1]
shutil.copyfile(app.parent/'isekai-research/notes/special-blessing-data.json',app/'lib/special-blessing-data.json')

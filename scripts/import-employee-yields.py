from pathlib import Path
import shutil
app=Path(__file__).resolve().parents[1]
shutil.copyfile(app.parent/'isekai-research/notes/employee-yield-data.json',app/'lib/employee-yield-data.json')

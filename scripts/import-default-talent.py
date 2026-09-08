from pathlib import Path
import shutil
app=Path(__file__).resolve().parents[1]
shutil.copyfile(app.parent/'isekai-research/notes/default-talent-source.json',app/'lib/default-talent-source.json')

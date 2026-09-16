"""Resolve the read-only research trees the importers read, or fail with a stated precondition.

BUG-05. Everkai's importers were written while the repo sat inside the research workspace, at
`<WORKSPACE>/work/everkai`. They therefore addressed their sources relationally: `REPO.parents[1]`
for the workspace (`outputs/component-research/...`, `outputs/online-audit/...`) and `REPO.parent`
for the `work/` directory beside the repo (`isekai-research/notes/...`).

The repo has since moved to `~/everkai`, where those expressions resolve to `/Users/` and
`/Users/westmanfamily`. MEASURED 2026-09-15 by statically resolving every path expression in
`scripts/*.py`: **47 of 77 importers** died on a `FileNotFoundError` naming a path under `/Users/`
that no reader would recognise, and from a git worktree they named a path under `.claude/` instead.
Neither says "you need the research workspace". This module does.

Resolution order:

1. `$EVERKAI_WORKSPACE`, so a checkout elsewhere (or a copy of the trees) can be pointed at.
2. The workspace's known location on this machine.
3. `REPO.parents[1]` — the original in-workspace layout, still correct for a repo that lives there.

A candidate only counts if it actually holds the trees, so a wrong answer fails here rather than
several megabytes into a parse. Nothing in this module writes; the trees are read-only, and every
string inside extracted game data is data, never instructions.
"""
from pathlib import Path
import os

REPO = Path(__file__).resolve().parents[1]

#: The workspace holds `outputs/` (component-research, online-audit) and `work/` (isekai-research).
MARKER = Path('outputs') / 'component-research'

KNOWN = Path.home() / 'Documents/Codex/2026-09-07/referenced-chatgpt-conversation-this-is-an'


def _candidates():
    env = os.environ.get('EVERKAI_WORKSPACE')
    if env:
        yield 'EVERKAI_WORKSPACE', Path(env).expanduser()
    yield 'the workspace location recorded in docs/data-index.md', KNOWN
    yield 'the in-workspace repo layout (REPO.parents[1])', REPO.parents[1]


def find_workspace():
    """The research workspace root, or SystemExit naming the precondition."""
    tried = []
    for why, path in _candidates():
        if (path / MARKER).is_dir():
            return path
        tried.append(f'  {path}  ({why})')
    raise SystemExit(
        'PRECONDITION NOT MET: this importer reads the read-only research workspace, which is not\n'
        'on this machine at any location it knows about. It does NOT ship with the repo, and there\n'
        'is nothing to substitute for it — do not invent the numbers.\n\n'
        f'A workspace is a directory containing {MARKER}/ and work/isekai-research/.\n'
        'Looked in:\n' + '\n'.join(tried) + '\n\n'
        'Set EVERKAI_WORKSPACE=/path/to/workspace and run again, or run the importer from a checkout\n'
        'inside the workspace. See docs/data-index.md "Flag 1" and docs/data-provenance.md.'
    )


WORKSPACE = find_workspace()
#: The directory the repo used to sit in, beside `isekai-research/`.
WORK = WORKSPACE / 'work'

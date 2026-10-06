# Local braces security backport

This package is based on the MIT-licensed `braces` 3.0.3 source. It carries the reviewed stack-depth fix from [micromatch/braces PR #72](https://github.com/micromatch/braces/pull/72), pinned at commit `28d440b5dd449dbf1fe6f3506cf94ecca4d02660`.

The local version `3.0.4-signal.0` identifies this repository's backport. It is not an upstream release. The backport limits nested brace/parenthesis parsing and recursive AST processing to 100 levels and rejects cyclic AST parent chains. The upstream test suite passed 904 tests at the pinned commit.

Keep the root npm override until the official `braces` release includes this fix. Then remove this directory and the override, install the official release, and re-run `npm audit` and the full project checks.

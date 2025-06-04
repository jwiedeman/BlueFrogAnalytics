# Sensor Fusion Bot (Python)

This experimental tool combines capabilities from the existing Recon test runner
and the Wappalyzer technology fingerprinting project. It reuses the dynamic test
loading system from `BOT-Recon_[Py]` and adds a new test which runs Wappalyzer
against a target domain.

Run `main.py` with the same flags as the Recon bot:

```bash
python main.py --target example.com --all --verbose
```

The new test `test_wappalyzer_integration.py` relies on the bundled Wappalyzer
library located in `../BOT-wappalyzer[Py]/`. It attempts multiple HTTP/HTTPS
variants of the target until technology fingerprints are found.

To expose Wappalyzer's technology database to the rest of the tests a helper
module `wappalyzer_data.py` loads the `technologies.json` file. A local copy of
`technologies.json`, `categories.json` and `groups.json` is stored under the
`data/` directory in this bot. If these files are absent it falls back to the
original copies from `../BOT-wappalyzer[Py]/`. This ensures the same categories
and matching rules used by Wappalyzer are available within the Sensor Fusion test
suite. The helper exposes a `get_wappalyzer()` function which returns a
`Wappalyzer` instance pre-configured with the bundled dataset. A convenience
`load_full_wappalyzer_data()` function returns the raw groups, categories and
technologies dictionaries for custom analysis.

The repository now includes the full technology set from Wappalyzer. Run
`scripts/compile_technologies.py` to rebuild `data/technologies.json` from the
JSON files in `../BOT-wappalyzer[Py]/src/technologies`. The precompiled file
contains over 5,000 technology definitions.

All existing tests from `BOT-Recon_[Py]` are discovered automatically, allowing
the full reconnaissance suite to run alongside the Wappalyzer fingerprinting.

## Additional Tests

A second test `test_crosscheck_server.py` compares the server detection output from
`BOT-Recon_[Py]`'s `test_server_fingerprinting.py` with Wappalyzer results. It
reports any overlap between the two techniques to help validate fingerprinting
accuracy.

The third test `test_wappalyzer_categories.py` lists detected technologies along
with their versions, categories and groups for quick reference.

The new test `test_wappalyzer_dataset.py` demonstrates loading the raw
categories and technologies using `wappalyzer_data` and runs detection through
the returned `Wappalyzer` engine.

`test_simple_matcher.py` demonstrates the bundled matcher in
`wappalyzer_matcher.py`. It now mirrors Wappalyzer's logic for URL,
header, HTML, script, cookie and meta pattern checks and resolves implied
technologies. The matcher also supports basic JS, DOM and DNS rules.
Versions, categories and high‑level groups are exposed for each detected
technology along with an aggregate confidence score calculated from the
matched patterns.


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

All existing tests from `BOT-Recon_[Py]` are discovered automatically, allowing
the full reconnaissance suite to run alongside the Wappalyzer fingerprinting.

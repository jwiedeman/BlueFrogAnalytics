# SpecReqs

Scripts and data files for generating implementation requirement documents.

## Contents
- CSV definitions for dimensions, events, packages, products and SDKs.
- `generate_requirements.py` – CLI that combines the CSVs into Excel, Word and PDF deliverables.
- `requirements.txt` – Python dependencies.

## Usage
Install the requirements and run the generator:

```bash
pip install -r requirements.txt
python generate_requirements.py --help
```

The script interactively prompts for product selections and outputs documents under `output/`.

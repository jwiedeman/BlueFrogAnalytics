# rightsem-final Worker

This worker validates email addresses collected from domains stored in the
`domains_processed` table. It only checks records where the `tech_detect` field
contains the string "wordpress". Emails are validated using DNS and SMTP
lookups and the results are written to `validated_emails.csv`.

## Usage

```bash
pip install -r requirements.txt
python rightsem_final_worker.py
```

The worker connects to Cassandra using the same default hosts as the other
Python workers in this repository.

---
"dmno": patch
---

- scaffold config.mts based on .env files and existing process.env/import.meta.env calls in code
- multiple .env files are loaded if present (ex: .env.production)
- dmno init also now does more to clean up / move existing .env files during dmno init

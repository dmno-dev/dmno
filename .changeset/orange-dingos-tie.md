---
"@dmno/nextjs-integration": patch
"@dmno/astro-integration": patch
"@dmno/vite-integration": patch
"@dmno/netlify-platform": patch
"dmno": patch
---

moving settings (secret redactor and http interception) to
settings within config, and inject behavior automatically when
injectDmnoGlobals is called

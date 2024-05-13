---
title: Security
description: DMNO is designed to keep your configuration safe and secure while maintaining simplicity and developer experience.
---


:::note[Secrets are special]
One of the things that sets DMNO apart from other configuration and secrets management solutions, is that it doesn't force you to treat secrets differently from the rest of your config. That doesn't mean they aren't _special_ though. 

Not only does DMNO offer you ways to manage your secrets via [plugins](/docs/plugins/overview/), but it also provides the guardrails in its core libraries to make sure they don't leak and to make sure things are encrypted when they need to be. 
:::

DMNO provides you with several ways to keep your sensitive config items safe. 

- All caches are encrypted 
- We prevent secrets from being displayed in the console wherever possible
- We provide a global `DMNO_PUBLIC_SECRETS` object that only includes _non-sensitive_ items
- Our integrations have middleware (wherever possible), that detects and alerts you if sensitive items are leaking into a public context (e.g., a webpage, or client side component)
- We provide [plugins](/docs/plugins/overview/), to securely store and retrieve your sensitive configuration, with minimal effort

:::caution[Secrets are still secrets]
That said, if someone has access to your running source code, then they have access to your secrets. So, design your systems accordingly.  Zero trust is always the best approach. 
:::

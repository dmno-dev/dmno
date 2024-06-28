---
title: Type-safe and secure Astro configuration with DMNO
date: 2024-06-28
---

![ENV VARS](https://astro.build/_astro/20240529_AstroConf_Photos_10848.CYftfPu-.webp)
*Astro CTO Matthew Phillips presenting Astro's new `astro:env` feature at Astro Together in Montreal.*

Configuration in Astro has improved drastically in recent weeks. We launched DMNO, including our [Astro integration](/docs/integrations/astro/), and shortly after Astro launched their official (experimental) `astro:env` feature in version [`4.10`](https://astro.build/blog/astro-4100/). We were very excited to see this on the main stage at [Astro Together in Montreal](https://astro.build/blog/astro-together-montreal/) (see above ^^), and to talk with the core team about how we can work together to make configuration in Astro even better. There's already some great [cross-pollination](https://github.com/withastro/roadmap/discussions/956) happening, and we're excited to see where it goes.

We're really glad to see Astro taking configuration seriously, and we're excited to see how the community uses these new tools to build even better sites. That said, we do think DMNO has some unique advantages that make it a great choice for many Astro projects, especially if you want to share config among other services, or collaborate securely with your teammates.

Here's a quick overview of what DMNO can do for you:

### Key Features

- **True type-safety**
Your config values are coerced, validated, and accessible with complete type-safety. Fail fast and early rather than bringing down production.
![Validation demo](@/assets/docs-images/validation-demo.png)

- **Built-in docs for your config**
We generate very rich types from your config schema, giving you built-in docs (Intellisense) for all of your config.
![Intellisense demo](@/assets/docs-images/intellisense-demo.png)

- **Store secrets securely:**
Use plugins to store and sync your sensitive config items in an encrypted file within your repo or remotely in 1Password. More secure backends coming soon! No more insecurely sharing secrets over slack!
![1Password demo](@/assets/docs-images/1pass-demo.png)


- **Leak detection:**
DMNO ensures that only non-sensitive config is accessible on the client side, and ensures sensitive config is never leaked by injecting an Astro middleware that  scans rendered server responses before sending them over the wire.
![Astro leak middleware demo](@/assets/docs-images/astro/leaked-secret-error.png)

- **Log redaction:**
DMNO redacts sensitive data from all global `console` method output, ensuring that your secrets are never exposed or persisted in your logs.
![Intellisense demo](@/assets/docs-images/console-redaction-demo.png)

- **HTTP interception:**
DMNO intercepts HTTP requests to prevent sensitive data from being sent to the wrong third-party services. e.g., Only send your Stripe key to `api.stripe.com`. 
![Intellisense demo](@/assets/docs-images/interceptor-demo.png)

- **Share config items in your monorepo:**
Unified config system for all of your services, with the ability to easy reuse items from the root or other services. Even outside of monorepos, using the same config system for your entire stack simplifies things.

- **Static and dynamic config:**
Fine control over which items are static (injected at build time) vs dynamic (loaded at boot), with additional safe-guards around using dynamic config during static pre-rendering. We even support dynamic public config loaded at runtime.


**Plus it's super easy to get started:**

- **Automatic initialization:**
Using `dmno init`, DMNO detects your Astro setup, automatically installs necessary packages, and updates your Astro config file. 

- **Easy scaffolding:**
DMNO scaffolds your config schema based on existing `.env` files and references to env vars throughout your codebase.

- **Accessible config objects:**
Just swap your calls from `process.env`/`import.meta.env` to the `DMNO_CONFIG` global that is automatically injected into your application. This gives you access to your type-safe config, helpful errors, and access to public+dynamic config items (if applicable).


**Astro-specific features:**

Most of these features are standard to DMNO, but there are a few Astro specific benefits and features:

- **Use env vars in astro config:**
Easily access env vars directly in your `astro.config.*` files.

- **Middleware injection:**
Automatically injects a middleware which detects leaked secrets in rendered responses as well as built js files being sent to the client. This middleware also warns if you accidentally use dynamic config items during pre-rendering of static pages.

- **Adapter support:**
Full support for the Netlify and Vercel adapters, with more in the works.

### Get started

DMNO provides the most powerful way to manage configuration in Astro projects, all while enhancing security, and improving developer experience. 

All it takes is `npx dmno init` 🎉

For more detailed information, visit the [DMNO Astro Integration Guide](https://dmno.dev/docs/integrations/astro/).

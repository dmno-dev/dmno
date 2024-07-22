---
title: Level up your env var tooling in Next.js with DMNO
date: 2024-07-22
---

We're super excited to finally announce that our [Next.js integration](/docs/integrations/nextjs/) is ready - and we believe it is the BEST way to manage configuration in Next.js apps. Dealing with config is Next.js has usually been an afterthought - use `process.env`, maybe a `.env` file, and call it a day. But the whole experience is clunky and leaves you open to some major security risks.

Here's a quick overview of the main problems and how DMNO solves them:


### 👷 Beyond type-safety 
<span class="gradient-text --red">**Problem:**</span> Environment variables are always plain strings, so you must coerce and validate them yourself (if at all). You also won't get any types on `process.env` unless you manually add them, and you probably shouldn't put a coerced non-string values back into `process.env` anyway.

<span class="gradient-text --green">**Solution:**</span> DMNO lets you define a simple schema for your config. Aside from being more clear, this lets us do some magical things:
- Easily add **coercion and validation** to your config, so you are guaranteed the data is what you think it is
- Validates your config during your build and **before boot**, so you'll know exactly what's wrong before bringing down prod
- **Auto-generated TypeScript types** that match your schema, including detailed JSDoc comments explaining what each config item does

![Validation demo](@/assets/docs-images/validation-demo.png)

![Intellisense demo](@/assets/docs-images/intellisense-demo.png)


### 🔐 Effortless secure collaboration
<span class="gradient-text --red">**Problem:**</span> Every time we onboard a new team member or add a new external service, we often need to share some set of secrets. You've _never_ sent anything like that over slack... right?? Not to mention needing to keep all the various platforms we build, test, and run our applications on all in sync.

<span class="gradient-text --green">**Solution:**</span> With your schema as part of your repo, you'll never pull down the latest only to be met with unexpected crashes due to missing config. Inline documentation and validations let you know exactly what each config item does, and whether it is required. Plugins let you sync sensitive config securely, either [encrypted in your repo](/docs/plugins/encrypted-vault/), or with secure backends like [1Password](/docs/plugins/1password/). Plus unifying how config is managed makes it much easier to reason about and debug.

![1Password demo](@/assets/docs-images/1pass-demo.png)


### 🤐 Leak detection
<span class="gradient-text --red">**Problem:**</span> With the edges of client and server getting blurrier each day, it has become easier to accidentally leak sensitive config. Your secrets can end up in server-rendered pages and data, built javascript code, or be sent to the wrong 3rd party - especially logging and error tracking tools.

<span class="gradient-text --green">**Solution:**</span> DMNO does [everything possible](/docs/get-started/security/) to protect you from accidental leaks. These features are opt-in but we think they are invaluable.
- DMNO patches global `console` methods to **scrub sensitive data from logs**
- Built client JS files and outgoing **server responses are scanned** for leaks before they are sent over the wire
- outgoing HTTP **requests are scanned** to make sure secrets can only be sent to whitelisted domains - e.g., only send your Stripe key to api.stripe.com

![Log redaction demo](@/assets/docs-images/console-redaction-demo.png)

![Astro leak middleware demo](@/assets/docs-images/nextjs/leak-error.png)

![HTTP interception demo](@/assets/docs-images/nextjs/intercept-error.png)


### 📐 Dynamic configuration control
<span class="gradient-text --red">**Problem:**</span> The `NEXT_PUBLIC_` prefix controls whether config is public AND whether it will be static, meaning replaced at build time. If you want build once and deploy for multiple contexts, you'll have to awkwardly wire up fetching the config on your own.

<span class="gradient-text --green">**Solution:**</span> DMNO decouples the concepts of "sensitive" and "dynamic", and supports both **sensitive+static** and **public+dynamic** config, and lets you set them explicitly in your config schema. This finer control is easier to reason about and we handle the hard part for you. See our [dynamic config guide](/docs/guides/dynamic-config/) for more details.

![Dynamic schema example](@/assets/docs-images/dynamic-schema-example.png)


### 🌲 Unified config system
<span class="gradient-text --red">**Problem:**</span> In a larger projects, especially monorepos, each part of your system ends up with its own hacked together config tooling, and there's no way to share config across services. Keeping things in sync is error-prone and awkward, and dealing with many different tools is a pain.

<span class="gradient-text --green">**Solution:**</span> DMNO lets you easily define config once and share it across your entire monorepo. Even outside of monoepos, using the same config system across your entire project will make your life much easier.

![Pick schema example](@/assets/docs-images/pick-schema-example.png)


### ⛓️ Flexible value dependencies
<span class="gradient-text --red">**Problem:**</span> Ideally we could set config values based on other values. While Next.js does have some built-in handling of multiple environment specific `.env` files (e.g., `.env.production`), this behavior is tied to the value of `NODE_ENV`. Since npm module installation behavior is also affected by this, often you'll end up running your build with `NODE_ENV` as `development` even when doing a non-production build. You can also use [$ expansion](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables#referencing-other-variables) to do some basic referencing, but it's extremely limited.

<span class="gradient-text --green">**Solution:**</span> DMNO's config resolution logic allows you to reference other values however you like. You can define switching logic based on any value (not just `NODE_ENV`) and reuse values within arbitrary functions. Your configuration schema all forms a reactive DAG, which can also be visualized for simple debugging.

![Config reuse schema example](@/assets/docs-images/reuse-schema-example.png)


---


## So what's _Next_
While much of what was described above is not specific to Next.js, a **TON** of specific work went into making sure our Next.js integration _just works_ without additional setup on your part. We want this to become the default way that everyone deals with configuration in their Next apps, and for JS/TS in general. This stuff may seem like it's not a problem, and day to day it may not be - until it bites you. Setting up your schema isn't much harder than writing a `.env.example` file and you get SO much more, so please [give it a try](/docs/get-started/quickstart/), and let us know what you think!

:::tip[Ready to give it a try?]
Hopefully the benefits are obvious, and we know once you try out DMNO, you'll love it 🥰.

Getting started is incredibly easy and it's 100% free and open-source.

All it takes is `npx dmno init` 🎉

For more detailed information, visit the [DMNO Next.js Integration Guide](https://dmno.dev/docs/integrations/nextjs/).
:::

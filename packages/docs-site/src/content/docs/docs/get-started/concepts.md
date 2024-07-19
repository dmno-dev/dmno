---
title: Concepts
description: Learn the core concepts of DMNO
---

DMNO is built on familiar concepts, but naming is hard and consistency in terminology is important - so we want to help clarify what we mean with a few terms:


## DMNO Concepts

### Workspace

The top level folder of your DMNO project. Usually this aligns with the root of your git repository itself.

In the single repo case, your workspace is made up of a single package.

In the monorepo case, this corresponds to the "workspace" concept of pnpm or the "workspace root" in yarn/npm.

:::caution
Confusingly, yarn and npm use the term "workspaces" when specifying where the child packages are located.

We try to follow pnpm's lead and refer to the whole thing as the "workspace" made up of "workspace packages".
:::


### DMNO Service

A package in your workspace that uses DMNO - and has a `.dmno` directory. This is usually a runnable/deployable chunk of your system (ex: database, api, website) but could be any package that uses config / env vars. Usually every package in your monorepo will be a dmno service except for simple shared libraries (e.g., shared eslint config, shared types). Sometimes, you may also have services that are purely used for grouping and to define shared config. 

Examples of packages likely to be DMNO services:
- `@my-org/api`
- `@my-org/website`

Examples of packages likely to NOT be DMNO services:
- `@my-org/eslint-config`
- `@my-org/shared-types`

### Root Service

Every DMNO workspace must have a single root service.

In the single-repo case, your workspace is made up of a single service, which is the root service.

In the monorepo case, this will be a single service that lives at your workspace root and is the default parent of all other services. In this case you wouldn't think of this service as a runnable chunk of your system, but instead as a place to define default settings inherited by other services and config to be shared across your whole system.


### Config Schema
Each DMNO service defines a configuration schema which is made up of many config items. Each item has a key and a data type - which defines things like validation and coercion logic, documentation, whether the item may be sensitive, and sometimes logic about how to set the value.

Your config schema should define the full shape of all the environment variables used by the service and items that may be defined by the service for use by other services.

### DMNO Data Type
DMNO has its own type system that covers validation, coercion, documentation, and even rules about how to set values. This type system also has an inheritance mechanism so types `extend` each other to form a chain of ancestors.

Our [`DmnoBaseTypes`](/docs/reference/base-types/) are factory functions that create an instance of a `DmnoDataType` and apply specific settings. For example: `DmnoBaseTypes.number({ min: 0, max: 100, precision: 0 })`.

To get actual properties from the type instance, in most cases we walk up that chain of ancestors until a value is found. In a few cases we may apply multiple values found on the ancestor chain - like merging multiple external docs links, or applying multiple validation functions.

Our data types can be used to generate extremely rich TypeScript types, and soon we will be able to generate types for other languages as well.

### Pick

In a monorepo project, services can reach into a parent or sibling to pick config items - and optionally transform keys and/or values along the way. This lets us easily define and reuse shared config items, and picking from siblings also gives us an implicit dependency graph of how our services are related.

Note - a service can pick any config item from a parent/ancestor, but only config items marked with `expose: true` from siblings.

### Resolution (resolve, resolvers)

DMNO config is loaded in 2 phases - first we load the schema itself, and then we attempt to resolve the values. This resolution process calls special resolver functions and passes in extra contextual information about the item being resolved and the rest of the resolved configuration values. This lets us form a reactive [DAG](https://en.wikipedia.org/wiki/D) to generate our configuration, and to understand much about the shape of that graph without necessarily needing to know the values themselves.

### Overrides
Your config schema may define how to resolve a value for a config item - but this value can always be overridden by a value coming from file-based overrides (`.env` files or similar) or from actual environment variables in your shell. A single item could have multiple overrides present and there is a precendence order that they are applied in. Being able to see all of these values and which one is currently active will save you tons of headaches.

For example, in order of least to most precedence:
- value from schema
- value from `.env`
- value from `.env.local`
- value from environment variable

### Plugin

DMNO plugins are packages that extend the functionality of DMNO itself. This could be anything from secrets backends to additional bundles of custom types. DMNO's open nature means this ecosystem of plugins will only continue to grow and evolve. 

### Integration 

DMNO integrations are packages that allow you to more easily use DMNO with other frameworks and tools. They sometimes have a different name within that tool, like "plugin", but these packages should include everything you need to easily integrate DMNO into that system, whether that be a plugin for that tool, helper functions, etc.

### Platform

DMNO platform packages are meant to provide everything you need to easily use dmno on a specific infrastructure platform. This could be a collection of data types, a pre-built config schema of all the env vars that platform injects into your app, plugins for their tools, or helper functions.

Often you will not need any special platform integration to use dmno on a platform, but it depends on the platform and which of their features you may be using.

## Related Terms

### "Monorepo" vs "Single project repo"
A **"monorepo"** is a technique where multiple related projects are developed from a single git (or other VCS) repository. DMNO is particularly useful in monorepos because sharing config across projects within a monorepo is hard. There are many reasons why working in a monorepo can be extremely beneficial, but many teams shy away from them because setting things up properly is hard. DMNO is aiming to fix that!

We use the term **"single project repo"** or sometimes **"single repo"** to denote the opposite kind of repository - one that contains only a single project. Although in larger systems this could also be part of a multi-repo strategy, where you have many related single project repos that make up your system.


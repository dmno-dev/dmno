---
title: Concepts
description: Learn the core concepts of DMNO
---

<!-- > **TODO** insert samples for each? and convert to DL  -->

DMNO is, at its core, a configuration engine. It _will_ work with your monolithic repos, but it _excels_ in multi-service monorepos. In this world, you can define a base config schema in your workspace root and then _pick_ and _transform_ items from there in any of the related child _services_. 

### Schema
One of DMNO's main advantages is type-safe configuration. We facilitate this by giving you the tools to define the schema of different configuration items (think: environment variables). 

### Workspace root

The top level folder of the repo. In the monolithic case, this is where all of your DMNO-related code lives. In the monorepo case, it contains base config that can be used by any child services. 

### Service

Within a monorepo, this is a workspace package that uses some config, and usually is a runnable/deployable chunk of your system. It could be an app, a site, a microservice, or occasionally even a shared library (if it uses config). In the DMNO world, these are all considered "services".

### Pick

When you reach into a parent (or sibling), you "pick" a config item. By default, any item from the parent can be _picked_ by a child. Additionally, any _output_ (config items with `expose: true`) of a sibling can be picked by any other service.

### Plugin

DMNO plugins are packages that extend the functionality of DMNO itself. This could be anything from secrets backends to additional bundles of custom types. DMNO's open nature means this ecosystem of plugins will only continue to grow and evolve. 

### Integration 

Integrations are packages that allow you to more easily use DMNO with other software. This means things like using DMNO to manage environment variables your chosen framework. 




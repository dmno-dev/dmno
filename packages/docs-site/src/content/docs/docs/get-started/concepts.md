---
title: Concepts
---

> **TODO** insert samples for each? 

DMNO is, at its core, a configuration engine. It _will_ work with your monolithic repos, but it _excels_ in multi-service monorepos. In this world, you can define a base config schema in your workspace root and then _pick_ and _transform_ items from there in any of the related child _services_. 

## Schema

One of DMNO's main advantages is type-safe configuration. We facilitate this by giving you the tools to define the schema of different configuration items (think: environment variables). 

## Workspace root

The root of the repo. In the monolithic case, this is where all of your DMNO-related code lives. In the monorepo case, it contains base config that can be used by any child service. 

## Service

Any subfolder that represents a "deployable chunk" of something. It could be an app, a site, a microservice. In the DMNO world, these are all considered "services".

## Pick

When you reach into a parent (or sibling), you "pick" a config item. By default, any item from the parent can be _picked_ by a child. Additionally, any _output_ of a sibling can be picked by any other service. 

## Plugin

DMNO plugins are packages that extend the functionality of DMNO itself. This could be anything from secrets backends to additional bundles of custom types. DMNO's open nature means this ecosystem of plugins will only continue to grow and evolve. 

## Integration 

Integrations are packages that allow you to more easily use DMNO with other software. This means things like using DMNO to manage env vars in your framework of choice. 




Check out the [docs](https://dmno.dev/docs/integrations/fastify/) for more information on how to use [DMNO](https://dmno.dev) + [Fastify](https://fastify.dev/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/fastify-integration [![npm](https://img.shields.io/npm/v/@dmno/fastify-integration)](https://www.npmjs.com/package/@dmno/fastify-integration)

Provides tooling to integrate DMNO into your Fastify app

### Installation

```bash
npm add @dmno/fastify-integration
```

### Example Usage

Import and register the `dmnoFastifyPlugin` when you initialize Fastify.

```typescript
import Fastify from 'fastify';
import { dmnoFastifyPlugin } from '@dmno/fastify-integration';

const fastify = Fastify({ /* your config */ })

// register the DMNO fastify plugin
fastify.register(dmnoFastifyPlugin);
```

Adjust your package json script to run via `dmno run`, which will first resolve and validate your config, and then inject it into the running process.

```json
{
  "name": "your-fastify-app",
  "scripts": {
    "dev": "dmno run -w -- nodemon src/main.js",
    "start": "dmno run -- node src/main.js"
  },
  // ...
}
```


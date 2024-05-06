Check out the [docs](https://dmno.dev/docs/guides/frameworks/nextjs/) for more information on how to use DMNO + Next.js.

*** THIS IS PREVIEW SOFTWARE AND SUBJECT TO RAPID CHANGE ***

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/nextjs-integration

Provides tooling to integrate dmno into your nextjs app

### How to use

#### Add to your next config

Initialize the plugin and use in your next config (`next.config.mjs`)

```typescript
import { dmnoNextConfigPlugin } from '@dmno/nextjs-integration';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // rest of user config...
};

export default dmnoNextConfigPlugin()(nextConfig);
```


#### Add to your site code

Import the module somewhere that will affect all pages - for example in `App.tsx` or `layout.tsx`
```typescript
import '@dmno/nextjs-integration';

//... the rest of your normal code ...
```


### Gotchas

Running `dmno run -w -- next dev` will automatically restart the next dev server on config changes, but unfortunately it does not trigger a page refresh in the browser


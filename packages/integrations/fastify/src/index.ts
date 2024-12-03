import Debug from 'debug';
import { injectDmnoGlobals } from 'dmno/inject-globals';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const debug = Debug('dmno:fastify-integration');

// injects the globals right away
debug('injecting dmno globals');
injectDmnoGlobals();

export const dmnoFastifyPlugin = fp(
  (async (fastify, _options) => {
    if ((globalThis as any)._DMNO_SERVICE_SETTINGS.preventClientLeaks) {
      debug('preventClientLeaks enabled - registering onSend hook to stop leaks');
      // this hook is run just before sending the response
      fastify.addHook('onSend', async (_request, reply, payload) => {
        (globalThis as any)._dmnoLeakScan(JSON.stringify(reply.getHeaders()), {
          method: '@dmno/fastify-integration - headers scan',
        });
        (globalThis as any)._dmnoLeakScan(payload, {
          method: '@dmno/fastify-integration - payload scan',
        });
        return payload;
      });
    }

    const pinoInstance = fastify.log as any;
    if ((globalThis as any)._DMNO_SERVICE_SETTINGS.redactSensitiveLogs && pinoInstance) {
      debug('redactSensitiveLogs enabled - adjusting existing pino logger instance');
      // fastify/pino doesn't let us adjust the pino instance after initialization so we are reaching into the internals
      // will open some issues to try to make this less awkward
      const hooksSym = Object.getOwnPropertySymbols(pinoInstance).find((s) => {
        return s.toString() === 'Symbol(pino.hooks)';
      });

      // ideally we'd be hooking in _later_ in the process, after things are serialized, but this will do for now
      // TODO: don't clobber an existing hook
      if (hooksSym && pinoInstance[hooksSym]) {
        pinoInstance[hooksSym] = {
          logMethod(inputArgs: any, method: any, _level: any) {
            const redactedArgs = inputArgs.map((globalThis as any)._dmnoRedact);
            return method.apply(this, redactedArgs);
          },
        };
      }
    }
  }) as FastifyPluginAsync,

  // additional plugin metadata
  {
    name: '@dmno/fastify-integration',
    fastify: '5.x',
  },
);


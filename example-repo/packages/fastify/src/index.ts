import Fastify from 'fastify';
import { dmnoFastifyPlugin } from '@dmno/fastify-integration';

const fastify = Fastify({
  logger: true,
  forceCloseConnections: true, // needed for vite-node HMR
})

// register our DMNO fastify plugin
fastify.register(dmnoFastifyPlugin);

// ~ ROUTES ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
fastify.get('/', function (request, reply) {
  console.log('`console.log` tests ---------------------------------------')
  console.log('log a secret:', DMNO_CONFIG.SOME_SECRET);
  console.log('log a secret in array:', [DMNO_CONFIG.SOME_SECRET]);
  console.log('log a secret in obj:', { secret: DMNO_CONFIG.SOME_SECRET });
  
  console.log('`request.log` tests ---------------------------------------')
  request.log.info(DMNO_CONFIG.SOME_SECRET, 'asdf'); // added as `msg`
  request.log.info([DMNO_CONFIG.SOME_SECRET]); // added as `0`
  request.log.info({ secret: DMNO_CONFIG.SOME_SECRET }); // overwrites keys on the obj

  reply.send({
    hello: 'world',
    demos: [
      `http://${request.host}/leak`,
      `http://${request.host}/intercept`
    ]
  })
});

fastify.get('/leak', function (request, reply) {
  // leak the secret as part of the response
  reply.send({
    superSecretKey: DMNO_CONFIG.SOME_SECRET,
    message: 'this endpoint should throw due to leaking a secret in the response',
  })
});

fastify.get('/intercept', async function (request, reply) {
  // send a secret to a domain that is not part of the allow list
  await fetch('https://api.sampleapis.com/coffee/hot', {
    headers: {
      'x-auth': DMNO_CONFIG.SOME_SECRET
    }
  });
  
  reply.send({ message: 'this endpoint should throw due to a leaked secret' });
});

// ~ START THE SERVER ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
fastify.listen({ port: DMNO_CONFIG.PORT }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  
  console.log(`Server now listening @ ${address.replace('[::1]', 'localhost')}`);
})


// ~ Live reload / HMR using vite-node ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", async () => {
    await fastify.close();

  });
  import.meta.hot.dispose(() => {
    console.log('hot.dispose');
    fastify.close()
  });
}

process.on('exit', () => {
  console.log('process.exit');
  fastify.close()
})

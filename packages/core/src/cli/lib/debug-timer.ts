import Debug from 'debug';




export function createDebugTimer(debugScope = 'debug') {
  let lastTimerAt: number | undefined;
  const debug = Debug(debugScope);

  return (label: string) => {
    if (!lastTimerAt) {
      lastTimerAt = +new Date();
      debug(`⏱️ ${label} - start`);
    } else {
      const now = +new Date();
      const duration = now - lastTimerAt;
      debug(`⏱️ ${label} - ${duration}ms`);
      lastTimerAt = now;
    }
  };
}

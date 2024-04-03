import Debug from 'debug';

const debug = Debug('dmno');

let lastTimerAt: number | undefined;
export function debugTimer(label: string) {
  if (!lastTimerAt) {
    lastTimerAt = +new Date();
    debug(`⏱️ ${label} - start`);
  } else {
    const now = +new Date();
    const duration = now - lastTimerAt;
    debug(`⏱️ ${label} - ${duration}ms`);
    lastTimerAt = now;
  }
}

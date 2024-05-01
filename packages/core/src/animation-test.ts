import { outdent } from 'outdent';
import logUpdate from 'log-update';
import { DOMINO_WITH_D, fallingDmnosAnimation } from './cli/lib/loaders';

console.log(DOMINO_WITH_D);


console.log(`
  ╭─────────────────╮  
  │   ▔    ╷   ▔    │ ┏  
┏━┥   ●    │   ●    ┝━┛
┻ │        ╯▃▖      │  
  ╰─────╥─────╥─────╯  
        ╜     ╙        `);


const getDom = (opts?: {
  message: string,
  wink?: 'right' | 'left',
}) => {
  const le = opts?.wink === 'left' ? '-' : '●';
  const re = opts?.wink === 'right' ? '-' : '⬤';
  const lb = '-  ';
  const rb = ' ^ ';

  const m = '▃▖';
  return `
  ╭─────────────────╮  
  │   ${lb}  ╷   ${rb}  │ ┏  ${opts?.message}
┏━┥   ${le}    │   ${re}    ┝━┛
┻ │        ╯${m}      │  
  ╰─────╥─────╥─────╯  
        ╜     ╙       
`;
};


let counter = 0;
const message = '♥ Thank you SO much!';
let wink: 'left' | 'right' | undefined;

const interval = setInterval(() => {
  logUpdate(getDom({
    message: message.slice(0, counter),
    wink,
  }));
  counter++;

  if (counter === message.length) {
    wink = 'left';
  }
  // if (counter === message.length + 5) {
  //   wink = 'right';
  // }
  if (counter === message.length + 5) {
    wink = undefined;
  }

  if (counter > message.length + 100) {
    clearInterval(interval);
  }
}, 100);

// await fallingDmnosAnimation();


import _ from 'lodash-es';
import kleur from 'kleur';
import gradient from 'gradient-string';
import { createDeferredPromise } from '@dmno/ts-lib';
import { outdent } from 'outdent';
import logUpdate from 'log-update';


const TERMINAL_COLS = Math.floor(process.stdout.columns * 0.9);
const LOADER_WIDTH = Math.min(TERMINAL_COLS, 100);

const gradientColorizer = gradient('cyan', 'pink');

export async function fallingDmnoLoader(
  loadingText: string = '',
  loadedText: string = '',
  totalTime = 1500,
) {
  if (loadingText) loadingText += ' ';
  if (loadedText) loadedText += ' ';

  const frameDelay = Math.floor(totalTime / LOADER_WIDTH / 2);

  // console.log(kleur.green('Loading DMNO schema'));

  const deferred = createDeferredPromise();

  let currentCol = 0;
  let isFalling = false;
  const interval = setInterval(() => {
    currentCol++;

    // ▌▞▂

    let str = '';
    if (!isFalling) {
      for (let i = 0; i < currentCol; i++) {
        if (i < loadingText.length) {
          str += loadingText.slice(i, i + 1);
        } else {
          str += '▌'; // ║
        }
      }
    } else {
      for (let i = 0; i <= LOADER_WIDTH; i++) {
        if (i < loadingText.length) {
          str += loadingText.slice(i, i + 1);
        } else if (i <= currentCol - 2) str += '▂';
        else if (i <= currentCol - 1) str += '▞';
        else if (i <= currentCol) str += '▞';
        else str += '▐'; // ▌▐
      }
    }
    logUpdate(kleur.bold().green(str));

    if (currentCol > LOADER_WIDTH) {
      if (!isFalling) {
        currentCol = 0;
        isFalling = true;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          let str = '';
          for (let i = 0; i <= LOADER_WIDTH; i++) {
            if (i < loadedText.length) {
              str += loadedText.slice(i, i + 1);
            } else {
              str += '▂';
            }
          }

          logUpdate(kleur.bold().green(str));
          console.log('\n');
          deferred.resolve();
        }, Math.floor(totalTime * 0.1));
      }
    }
  }, frameDelay);

  return deferred.promise;
}


export async function fallingDmnosAnimation(
  loadingText: string = '',
  loadedText: string = '',
  totalTime = 1500,
) {
  if (loadingText) loadingText += ' ';
  if (loadedText) loadedText += ' ';

  const frameDelay = Math.floor(totalTime / LOADER_WIDTH / 2);

  const deferred = createDeferredPromise();

  let currentCol = 0;
  let isFalling = false;
  const interval = setInterval(() => {
    currentCol++;

    let str = '';
    if (!isFalling) {
      for (let i = 0; i < currentCol; i++) {
        if (i === 0) str += '👆';
        else str += '▐';
      }
    } else {
      for (let i = 0; i < LOADER_WIDTH; i++) {
        if (i === 0) str += '👉';
        // else if (i < loadingText.length) {
        //   str += loadingText.slice(i, i + 1);
        else if (i < currentCol) str += '▂';
        else if (i === currentCol) str += '▞';
        else str += '▐';
      }
    }
    logUpdate(gradientColorizer(str + ' '.repeat(LOADER_WIDTH + 1 - str.length)));

    if (currentCol === LOADER_WIDTH) {
      if (!isFalling) {
        currentCol = 0;
        isFalling = true;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          let str = loadedText;
          str += '▂'.repeat(LOADER_WIDTH + 1 - str.length);

          logUpdate(gradientColorizer(str));
          console.log('\n');
          deferred.resolve();
        }, Math.floor(totalTime * 0.1));
      }
    }
  }, frameDelay);

  return deferred.promise;
}


export const DMNO_DEV_BANNER2 = gradient('#00FF0A', '#00C2FF').multiline(outdent`
  ┌─╮╭─┬─╮╭─┬┐╭─╮ ┌─╮╭─┐┌┬┐
  │╷││╷│╷││╷│││╷│ ││││ ┤│││
  │╵│││╵││││╵││╵│ ││││ ┤│╵│
  └─╯└┴─┴┘└┴─╯╰─╯○└─╯╰─┘╰─╯
`);
export const DMNO_DEV_BANNER = gradient('#00FF0A', '#00C2FF').multiline(outdent`
  ┌─╮╭─┬─╮╭─┬┐╭─╮ ┌─╮╭─┐┌┬┐ ╭───────────╮ 
  │╷││╷│╷││╷│││╷│ ││││ ┤│││ │ ● ● │ ●   │ 
  │╵│││╵││││╵││╵│ ││││ ┤│╵│ │ ● ● │   ● │ 
  └─╯└┴─┴┘└┴─╯╰─╯○└─╯╰─┘╰─╯ ╰───────────╯ 
`);

// let DOMINO_W_D = gradient('#00FF0A', '#00C2FF').multiline(outdent`
//   ╭───────────╮
//   │ ● ● │ ┌─╮ │
//   │ ● ● │ └─╯ │
//   ╰───────────╯
// `);
const EMPTY_DOMINO = outdent`
  ╭───────────╮
  │     │     │
  │     │     │
  ╰───────────╯
`;
const DMNO_W_D_WHITE = outdent`
  ╭───────────╮
  │   ○ │ ┌─╮ │
  │ ○   │ └─╯ │
  ╰───────────╯
`;

const EMPTY_DOMINO_LINES = gradient('#00FF0A', '#00C2FF').multiline(EMPTY_DOMINO).split('\n');
const dominoWithDArray = structuredClone(EMPTY_DOMINO_LINES);
dominoWithDArray[1] = spliceString(dominoWithDArray[1], 193, 50, kleur.white('┌─╮'));
dominoWithDArray[2] = spliceString(dominoWithDArray[2], 193, 50, kleur.white('└─╯'));
dominoWithDArray[1] = spliceString(dominoWithDArray[1], 55, 50, kleur.white('  ○'));
dominoWithDArray[2] = spliceString(dominoWithDArray[2], 55, 50, kleur.white('○  '));



// splicing with ansi codes is very finnicky... will need better tooling, but this helps a bit
// for (let i = 0; i < EMPTY_DOMINO_LINES[1].length; i++) {
//   const dominoWithDArray = structuredClone(EMPTY_DOMINO_LINES);
//   // dominoWithDArray[1] = spliceString(dominoWithDArray[1], i, 50, kleur.white('┌─╮'));
//   // dominoWithDArray[2] = spliceString(dominoWithDArray[2], i, 50, kleur.white('└─╯'));
//   dominoWithDArray[1] = spliceString(dominoWithDArray[1], i, 50, kleur.white('● ●'));
//   dominoWithDArray[2] = spliceString(dominoWithDArray[2], i, 50, kleur.white('● ●'));
//   console.log(i);
//   console.log(dominoWithDArray.join('\n'));
// }


// dominoWithDArray[1] = spliceString(dominoWithDArray[1], 172, 3, kleur.white('┌─╮'));
// dominoWithDArray[2] = spliceString(dominoWithDArray[2], 172, 3, kleur.white('└─╯'));
export const DOMINO_WITH_D = dominoWithDArray.join('\n');

export default function spliceString(string: string, index: number, count: number, insert: string) {
  const array = _.toArray(string);
  array.splice(index, count, insert);
  return array.join('');
}

export function getDmnoMascot(message: string = '') {
  return `
  ╭─────────────────╮  
  │        ╷        │ ┏  ${message ? '💬' : ''}${message}
┏━┥   ⬤    │   ⬤    ┝━┛
┻ │        ╯▃▖      │  
  ╰─────╥─────╥─────╯  
        ╜     ╙        `;
}


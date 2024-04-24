import _ from 'lodash-es';
import kleur from 'kleur';
import gradient from 'gradient-string';
import { createDeferredPromise } from '@dmno/ts-lib';
import { outdent } from 'outdent';


const TERMINAL_COLS = Math.floor(process.stdout.columns * 0.75);

const gradientColorizer = gradient('cyan', 'pink');

export async function fallingDmnoLoader(
  loadingText: string = '',
  loadedText: string = '',
  totalTime = 1500,
) {
  if (loadingText) loadingText += ' ';
  if (loadedText) loadedText += ' ';

  const frameDelay = Math.floor(totalTime / TERMINAL_COLS / 2);

  // console.log(kleur.green('Loading DMNO schema'));

  const deferred = createDeferredPromise();

  let currentCol = 0;
  let isFalling = false;
  const interval = setInterval(() => {
    currentCol++;


    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

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
      for (let i = 0; i <= TERMINAL_COLS; i++) {
        if (i < loadingText.length) {
          str += loadingText.slice(i, i + 1);
        } else if (i <= currentCol - 2) str += '▂';
        else if (i <= currentCol - 1) str += '▞';
        else if (i <= currentCol) str += '▞';
        else str += '▐'; // ▌▐
      }
    }
    process.stdout.write(kleur.bold().green(str));

    if (currentCol > TERMINAL_COLS) {
      if (!isFalling) {
        currentCol = 0;
        isFalling = true;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);

          let str = '';
          for (let i = 0; i <= TERMINAL_COLS; i++) {
            if (i < loadedText.length) {
              str += loadedText.slice(i, i + 1);
            } else {
              str += '▂';
            }
          }

          process.stdout.write(kleur.bold().green(str));
          process.stdout.write('\n');
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
  totalTime = 5000,
) {
  if (loadingText) loadingText += ' ';
  if (loadedText) loadedText += ' ';

  const frameDelay = Math.floor(totalTime / TERMINAL_COLS / 2);

  const deferred = createDeferredPromise();

  let currentCol = 0;
  let isFalling = false;
  const interval = setInterval(() => {
    currentCol++;

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    let str = '';
    if (!isFalling) {
      str = '▐'.repeat(currentCol)
        + ' '.repeat(TERMINAL_COLS - currentCol);
    } else {
      for (let i = 0; i < TERMINAL_COLS; i++) {
        if (i === 0) str += '👉';
        // else if (i < loadingText.length) {
        //   str += loadingText.slice(i, i + 1);
        else if (i < currentCol) str += '▂';
        else if (i === currentCol) str += '▞';
        else str += '▐';
      }
    }

    process.stdout.write(gradientColorizer(str));

    if (currentCol === TERMINAL_COLS) {
      if (!isFalling) {
        currentCol = 0;
        isFalling = true;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);

          let str = '';
          for (let i = 0; i < TERMINAL_COLS; i++) {
            if (i < loadedText.length) {
              str += loadedText.slice(i, i + 1);
            } else {
              str += '▂';
            }
          }

          process.stdout.write(gradientColorizer(str));
          process.stdout.write('\n');
          deferred.resolve();
        }, Math.floor(totalTime * 0.1));
      }
    }
  }, frameDelay);

  return deferred.promise;
}

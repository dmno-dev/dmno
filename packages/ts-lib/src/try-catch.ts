import isPromise from 'is-promise';

// see https://www.npmjs.com/package/no-try for inspiration
// although their focus was not on the typing...

/** try-catch alternative that exposes a typed response rather than having it stuck in the try's scope */
export async function tryCatch<T, E>(
  tryFn: () => T | Promise<T>,
  catchFn: (err: Error) => E | Promise<E>,

// @ts-ignore
): Promise<T | E> {
  try {
    return await tryFn();
  } catch (err) {
    let catchResult = catchFn(err as Error);
    if (isPromise(catchResult)) {
      catchResult = await catchResult;
    }
    return catchResult;
  }
}

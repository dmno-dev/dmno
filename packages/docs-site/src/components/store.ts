import { atom } from 'nanostores';

export type AvailablePms = 'npm' | 'pnpm' | 'Yarn' | string;

const storedVal = () => {
  if (typeof localStorage !== 'undefined') {
    const val = localStorage.getItem('currentPm');
    return val;
  }
};

const currentPm = atom<AvailablePms>(storedVal() || 'pnpm');

const setCurrentPm = (pm: AvailablePms) => {
  currentPm.set(pm);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('currentPm', pm);
  }
};

const getCurrentPm = () => {
  return currentPm.get();
};

export { currentPm, setCurrentPm, getCurrentPm };


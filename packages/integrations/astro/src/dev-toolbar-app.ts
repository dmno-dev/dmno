import { DevToolbarApp } from 'astro';

const DmnoAstroDevToolbarApp: DevToolbarApp = {
  id: 'dmno-plugin',
  name: 'DMNO config',
  // TODO: better logo? import file instead?
  icon: `<svg width="360" height="360" viewBox="0 0 360 360" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="252" cy="252" r="58" fill="white"/>
  <path d="M165.556 107.778C165.556 139.688 139.688 165.556 107.778 165.556C107.764 165.556 107.749 165.556 107.735 165.556H50V50H107.778C139.688 50 165.556 75.868 165.556 107.778Z" fill="white"/>
  <path d="M107.83 310C107.812 310 107.795 310 107.778 310L50 310V252.222C50 220.312 75.868 194.444 107.778 194.444C139.688 194.444 165.556 220.312 165.556 252.222C165.556 252.232 165.556 252.242 165.556 252.252L165.556 310L107.83 310Z" fill="white"/>
  <path d="M310 107.83C310 107.812 310 107.795 310 107.778C310 75.868 284.132 50 252.222 50H194.444V165.556L252.222 165.556C252.232 165.556 252.242 165.556 252.252 165.556L310 165.556L310 107.83Z" fill="white"/>
  </svg>`,
  init() {
    console.log("I'm a dev toolbar app!");
  },
};

export default DmnoAstroDevToolbarApp;

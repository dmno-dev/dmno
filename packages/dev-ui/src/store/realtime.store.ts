import { defineStore } from 'pinia';
import { io, Socket } from 'socket.io-client';
import { ref } from 'vue';

type ConnectionStatus = 'disconnected' | 'connected' | 'connecting' | 'reconnecting';


interface ServerToClientEvents {
  'workspace-update': (workspace: any) => void;

}

interface ClientToServerEvents {
  'reload': () => void;
  'launch-editor': (fileUrl: string) => void;
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents>;

export const useRealtimeStore = defineStore('realtime', () => {
  let useSsl = window.location.protocol === 'https:';
  let wsUrl = `${useSsl ? 'wss' : 'ws'}://${window.location.host}`;


  // while we are doing dev on the ui itself, we want to connect to a running config server
  // TODO: use config to detect if we running in vite dev mode or from built code
  if (window.location.host === 'localhost:4666') {
    // we'll assume the local server is running w/ default settings
    wsUrl = 'ws://dev.dmno.local:3666';
    useSsl = true;
  }

  socket = io(wsUrl, {
    path: '/ws',
    reconnectionDelayMax: 10000,
    secure: useSsl,
    rejectUnauthorized: false,
    transports: ['websocket'],
  });

  const connectionStatus = ref<ConnectionStatus>('disconnected');
  socket.on('connect', () => {
    connectionStatus.value = 'connected';
    socket.emit('reload');
  });
  socket.io.on('reconnect', (attempt) => {
    // ...
  });
  socket.io.on('reconnect_attempt', (attempt) => {
    // ...
  });
  socket.io.on('reconnect_error', (error) => {
    // ...
  });
  socket.io.on('reconnect_failed', () => {
    // ...
  });


  // socket.on('request-responst', () => {
  //   console.log('response!');
  // });
  return {
    connectionStatus,
    socket,
    // sendMessage,
    // subscribe,
    // unsubscribe,

    // subscriptions, // can expose here to show in devtools
  };
});

export function openEditorToFile(fileUrl: string) {
  console.log('opening editor', fileUrl);
  socket.emit('launch-editor', fileUrl);
}

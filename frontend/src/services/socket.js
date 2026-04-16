import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";

// Singleton socket instance — connects lazily
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {},
    });
  }
  return socket;
}

export function connectSocket(token, uid) {
  const s = getSocket();
  s.auth = {
    ...(token ? { token } : {}),
    ...(uid ? { uid } : {}),
  };
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

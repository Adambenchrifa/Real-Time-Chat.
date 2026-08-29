import { io, Socket } from 'socket.io-client';
import {
  ApiResponse,
  AuthResponse,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@chat/shared';

const SERVER_URL = 'http://localhost:3001';
const DEFAULT_CONVERSATION_ID = 'c1309e35-53c5-44a1-ab0c-1e7dacad7f67';
const PASSWORD = 'password123';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function login(email: string): Promise<string> {
  const res = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });

  const json = (await res.json()) as ApiResponse<AuthResponse>;
  if (!res.ok || !json.success || !json.data?.accessToken) {
    throw new Error(
      `Login failed for ${email}: ${json.error?.message ?? res.statusText}`
    );
  }

  console.log(`[login] ${email} ok`);
  return json.data.accessToken;
}

function connectSocket(label: string, token: string): TypedSocket {
  const socket: TypedSocket = io(SERVER_URL, {
    auth: { token },
  });

  socket.on('connect', () => {
    console.log(`[${label}] connected (${socket.id})`);
  });

  socket.on('connect_error', (err) => {
    console.log(`[${label}] connect_error: ${err.message}`);
  });

  socket.on('error', (error) => {
    console.log(
      `[${label}] error: ${error.message}${error.code ? ` (${error.code})` : ''}`
    );
  });

  socket.on('user_joined', (payload) => {
    console.log(
      `[${label}] user_joined: ${payload.user.username} -> ${payload.conversationId}`
    );
  });

  socket.on('new_message', (message) => {
    console.log(
      `[${label}] new_message from ${message.sender.username}: ${message.content}`
    );
  });

  return socket;
}

function waitForConnect(socket: TypedSocket, label: string): Promise<void> {
  if (socket.connected) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} did not connect in time`));
    }, 5000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function waitForEvent<E extends keyof ServerToClientEvents>(
  socket: TypedSocket,
  event: E,
  timeoutMs = 5000
): Promise<Parameters<ServerToClientEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${String(event)}`));
    }, timeoutMs);

    // @ts-expect-error TypeScript cannot infer the generic socket event listener
    socket.once(event, ((payload: Parameters<ServerToClientEvents[E]>[0]) => {
      clearTimeout(timeout);
      resolve(payload);
    }) as ServerToClientEvents[E]);
  });
}

async function main(): Promise<void> {
  const conversationId = process.argv[2] || DEFAULT_CONVERSATION_ID;
  console.log(`Conversation id: ${conversationId}`);

  const [aliceToken, bobToken] = await Promise.all([
    login('alice@example.com'),
    login('bob@example.com'),
  ]);

  const alice = connectSocket('alice', aliceToken);
  const bob = connectSocket('bob', bobToken);

  await Promise.all([
    waitForConnect(alice, 'alice'),
    waitForConnect(bob, 'bob'),
  ]);

  let aliceSawOwnTyping = false;
  let bobSawAliceTyping = false;

  alice.on('typing_start', (payload) => {
    aliceSawOwnTyping = true;
    console.log(
      `[alice] typing_start from ${payload.userId} (UNEXPECTED if this is alice)`
    );
  });

  bob.on('typing_start', (payload) => {
    bobSawAliceTyping = true;
    console.log(`[bob] typing_start from ${payload.userId}`);
  });

  alice.emit('join_conversation', conversationId);
  console.log('[alice] emitted join_conversation');
  await sleep(300);

  const bobJoined = waitForEvent(alice, 'user_joined');
  bob.emit('join_conversation', conversationId);
  console.log('[bob] emitted join_conversation');
  await bobJoined;
  await sleep(200);

  const bobTyping = waitForEvent(bob, 'typing_start');
  alice.emit('typing_start', conversationId);
  console.log('[alice] emitted typing_start');
  await bobTyping;
  await sleep(200);

  if (bobSawAliceTyping) {
    console.log('[check] bob received typing_start (expected)');
  } else {
    console.log('[check] bob DID NOT receive typing_start (unexpected)');
  }

  if (aliceSawOwnTyping) {
    console.log('[check] alice received her own typing_start (unexpected)');
  } else {
    console.log(
      '[check] alice did not receive her own typing_start (expected)'
    );
  }

  const aliceFirst = waitForEvent(alice, 'new_message');
  const bobFirst = waitForEvent(bob, 'new_message');
  alice.emit('send_message', {
    conversationId,
    content: 'Hello Bob! This is Alice 🚀',
  });
  console.log('[alice] emitted send_message');
  await Promise.all([aliceFirst, bobFirst]);

  const aliceSecond = waitForEvent(alice, 'new_message');
  const bobSecond = waitForEvent(bob, 'new_message');
  bob.emit('send_message', {
    conversationId,
    content: 'Hi Alice! Got your message ✅',
  });
  console.log('[bob] emitted send_message');
  await Promise.all([aliceSecond, bobSecond]);

  await sleep(3000);

  alice.disconnect();
  bob.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

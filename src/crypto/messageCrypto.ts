const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

export type EncryptedMessage = {
  version: 1;
  ciphertext: string;
  iv: string;
};

const toBase64 = (value: ArrayBuffer | Uint8Array) => {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

function getKey(secret: string, instanceId: string) {
  const cacheId = `${instanceId}:${secret}`;
  let key = keyCache.get(cacheId);
  if (!key) {
    key = crypto.subtle
      .importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"])
      .then((sourceKey) =>
        crypto.subtle.deriveKey(
          {
            name: "HKDF",
            hash: "SHA-256",
            salt: encoder.encode(`green-chat:${instanceId}`),
            info: encoder.encode("firebase-message-cache:v1"),
          },
          sourceKey,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        ),
      );
    keyCache.set(cacheId, key);
  }
  return key;
}

const context = (instanceId: string, chatId: string, messageId: string) =>
  encoder.encode(`${instanceId}\u0000${chatId}\u0000${messageId}`);

export async function encryptMessageText(
  text: string,
  secret: string,
  instanceId: string,
  chatId: string,
  messageId: string,
): Promise<EncryptedMessage> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: context(instanceId, chatId, messageId),
    },
    await getKey(secret, instanceId),
    encoder.encode(text),
  );
  return { version: 1, ciphertext: toBase64(ciphertext), iv: toBase64(iv) };
}

export async function decryptMessageText(
  encrypted: EncryptedMessage,
  secret: string,
  instanceId: string,
  chatId: string,
  messageId: string,
) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(encrypted.iv),
      additionalData: context(instanceId, chatId, messageId),
    },
    await getKey(secret, instanceId),
    fromBase64(encrypted.ciphertext),
  );
  return decoder.decode(plaintext);
}

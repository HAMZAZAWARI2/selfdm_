import nacl from 'tweetnacl';
import AES from "crypto-js/aes";
import enc from "crypto-js/enc-utf8";

// Helpers
const bufferToHex = (buffer) => Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
const hexToBuffer = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const generateECCKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: bufferToHex(keyPair.publicKey),
    privateKey: bufferToHex(keyPair.secretKey)
  };
};

const encryptPrivateKey = (key, password) => AES.encrypt(key, password).toString();
const decryptPrivateKey = (key, password) => AES.decrypt(key, password).toString(enc);

// 🔐 Encrypt message with ephemeral key (receiver only)
const encryptWithEphemeralKey = (message, receiverPublicHex) => {
  const receiverPublic = hexToBuffer(receiverPublicHex);
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = new TextEncoder().encode(message);
  const sharedKey = nacl.box.before(receiverPublic, ephemeral.secretKey);
  const ciphertext = nacl.box.after(messageUint8, nonce, sharedKey);
  return {
    ciphertext: Array.from(ciphertext),
    nonce: Array.from(nonce),
    ephemeralPublicKey: bufferToHex(ephemeral.publicKey)
  };
};

// 🧠 Encrypt for both sender and receiver using ephemeral key
const encryptForBoth = (message, receiverPublicHex, senderPublicHex) => {
  const receiverPublic = hexToBuffer(receiverPublicHex);
  const senderPublic = hexToBuffer(senderPublicHex);
  const ephemeral = nacl.box.keyPair();
  const messageUint8 = new TextEncoder().encode(message);

  // Encrypt for receiver
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const sharedReceiver = nacl.box.before(receiverPublic, ephemeral.secretKey);
  const ciphertext = nacl.box.after(messageUint8, nonce, sharedReceiver);

  // Encrypt for sender
  const selfNonce = nacl.randomBytes(nacl.box.nonceLength);
  const sharedSender = nacl.box.before(senderPublic, ephemeral.secretKey);
  const selfCiphertext = nacl.box.after(messageUint8, selfNonce, sharedSender);

  return {
    ciphertext: Array.from(ciphertext),
    nonce: Array.from(nonce),
    ephemeralPublicKey: bufferToHex(ephemeral.publicKey),
    selfCiphertext: Array.from(selfCiphertext),
    selfNonce: Array.from(selfNonce)
  };
};

// 🔓 Decrypt message with ephemeral public key from sender
const decryptWithEphemeralKey = (cipherArray, nonceArray, ephemeralHex, receiverPrivateHex) => {
  const ciphertext = new Uint8Array(cipherArray);
  const nonce = new Uint8Array(nonceArray);
  const ephemeralPublic = hexToBuffer(ephemeralHex);
  const receiverPrivate = hexToBuffer(receiverPrivateHex);
  const sharedKey = nacl.box.before(ephemeralPublic, receiverPrivate);
  const decrypted = nacl.box.open.after(ciphertext, nonce, sharedKey);
  return decrypted ? new TextDecoder().decode(decrypted) : null;
};

export {
  generateECCKeyPair,
  bufferToHex,
  hexToBuffer,
  encryptPrivateKey,
  decryptPrivateKey,
  encryptWithEphemeralKey,
  encryptForBoth,
  decryptWithEphemeralKey
};

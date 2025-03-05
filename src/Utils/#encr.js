// encryption.js
import nacl from 'tweetnacl';
import CryptoJS from 'crypto-js';
import AES from "crypto-js/aes";
import enc from "crypto-js/enc-utf8";

const bufferToHex = (buffer) => {
    return Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

const hexToBuffer = (hex) => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
};

const generateECCKeyPair = () => {
    const keyPair = nacl.box.keyPair();  // Generate the key pair

    // Convert the public and secret keys to hex and log them
    const publicKey = bufferToHex(keyPair.publicKey);
    const privateKey = bufferToHex(keyPair.secretKey);

    return {
        publicKey,
        privateKey,
    };
}

const encryptPrivateKey = (key, password) => {
    try {
        const encrypted = AES.encrypt(key, password).toString();
        return encrypted;
    } catch (error) {
        console.error("Encryption error:", error);
        throw error;
    }
};

const decryptPrivateKey = (key, password) => {
    try {
        const bytes = AES.decrypt(key, password);
        const decrypted = bytes.toString(enc);
        return decrypted;
    } catch (error) {
        console.error("Decryption error:", error);
        throw error;
    }
};

export {
    generateECCKeyPair,
    bufferToHex,
    hexToBuffer,
    encryptPrivateKey,
    decryptPrivateKey
};

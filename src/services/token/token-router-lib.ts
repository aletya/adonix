import * as crypto from 'crypto';

export function generateRandomString(length : number) : string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    // eslint-disable-next-line no-magic-numbers
    return Array.from(array, byte => String.fromCharCode(33 + (byte % 94))).join('');
}
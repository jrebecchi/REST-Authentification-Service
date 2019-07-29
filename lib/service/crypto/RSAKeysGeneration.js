const { generateKeyPairSync } = require('crypto');

const generateKeys = () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        }
    });
    return { publicKey, privateKey };
}

module.exports = { generateKeys };
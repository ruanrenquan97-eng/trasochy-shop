const fs = require('fs');
const path = require('path');
const p1 = path.resolve(__dirname, 'certs/apiclient_cert.pem');
console.log('Certs file exists:', fs.existsSync(p1));
console.log('Certs path:', p1);

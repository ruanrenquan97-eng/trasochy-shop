const fs = require('fs');
const p1 = 'Z:\\市场部美工文件\\私有云\\我的AI管理系统\\TRASOCHY-shop\\certs\\apiclient_cert.pem';
const p2 = 'e:\\私有云\\我的AI管理系统\\TRASOCHY-shop\\certs\\apiclient_cert.pem';
console.log('Z drive:', fs.existsSync(p1));
console.log('E drive:', fs.existsSync(p2));

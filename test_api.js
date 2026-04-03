const http = require('http');

const data = JSON.stringify({
  email: 'test999@inha.ac.kr',
  password: '123',
  name: 'tester',
  major: 'cs',
  keywords: 'test'
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseData = '';
  res.on('data', chunk => responseData += chunk);
  res.on('end', () => console.log('BODY:', responseData));
});
req.on('error', error => console.error(error));
req.write(data);
req.end();

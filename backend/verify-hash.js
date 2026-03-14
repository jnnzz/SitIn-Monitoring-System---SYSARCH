const bcrypt = require('bcryptjs');

const storedHash = '$2a$10$N9qo8uLOickgx2ZqhJWTfOZa/0E5A2x1YNpJ1Nw.GpwF8t9eE7gZ6';
const password = 'admin123';

bcrypt.compare(password, storedHash).then(match => {
  console.log('Password matches:', match);
  if (!match) {
    console.log('Hash is incorrect! Generating new one...');
    return bcrypt.hash(password, 10);
  }
}).then(newHash => {
  if (newHash) {
    console.log('New correct hash:', newHash);
  }
}).catch(err => {
  console.error('Error:', err);
});

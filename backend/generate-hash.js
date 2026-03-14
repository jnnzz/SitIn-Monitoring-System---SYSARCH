const bcrypt = require('bcryptjs');

bcrypt.hash('admin123', 10).then(hash => {
  console.log(hash);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

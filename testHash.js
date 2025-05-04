import bcrypt from 'bcrypt';

async function testHash() {
  const storedHash = '$2b$10$mtYUBhUY2o7Pr3YiSWglGe.TAX3oNKeCNaLOFBTTBLjxYxfWuZh9C';
  const passwordToTest = 'TestPass@123';
  const match = await bcrypt.compare(passwordToTest, storedHash);
  console.log(`Does "${passwordToTest}" match the stored hash? ${match}`);
}

testHash();
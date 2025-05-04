import bcrypt from 'bcrypt';
import { MongoClient } from 'mongodb';

async function updatePassword() {
  const client = new MongoClient('mongodb+srv://vmsadmin:UoMVMSmm@vms-cluster.hgadmlc.mongodb.net/vms', { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db('vms');
    const hashedPassword = await bcrypt.hash('HafsaM@123', 10);
    await db.collection('visitorsignups').updateOne(
      { username: 'Hafsa' },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );
    console.log('Password updated to match HafsaM@123');
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    await client.close();
  }
}

updatePassword();
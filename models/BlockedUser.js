import mongoose from 'mongoose';

const blockedUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    
  },
  role: {
    type: String,
    required: true,
  },
  blockedOn: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    required: true,
  },
});

const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);
export default BlockedUser;
import Counter from "../models/Counter.js";

export const getNextSequence = async (name) => {
  const updated = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return updated.seq;
};
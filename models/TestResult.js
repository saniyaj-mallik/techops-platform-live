import mongoose from 'mongoose';

const TestResultSchema = new mongoose.Schema({
  type: { type: String, enum: ['Success', 'Failure'], required: true },
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  size: { type: Number },
  meta: { type: Object }, // for any extra info
});

export default mongoose.models.TestResult || mongoose.model('TestResult', TestResultSchema);

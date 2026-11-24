// User schema. Passwords are hashed in the service layer and are never selected by default.
import mongoose from 'mongoose';

export const USER_ROLES = ['admin', 'customer'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: USER_ROLES, default: 'customer' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ role: 1, isActive: 1 });

export default mongoose.model('User', userSchema);

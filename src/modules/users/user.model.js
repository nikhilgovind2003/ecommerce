// User schema. Passwords are hashed before saving and are never sent back in responses.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROLES = ['admin', 'customer'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'customer' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
export { ROLES };

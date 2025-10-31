import mongoose, { Schema, Document } from "mongoose";

export type Role = 'Admin' | 'Booker' | 'Payment_Admin';

export interface IRtrUser extends Document {
    fasttrakId: string;
    email?: string;
    name?: string;
    roles: Role[];
    lastSeen?: Date;
    createdAt?: Date;
}

const UserSchema = new Schema<IRtrUser>({
    fasttrakId: {type: String, required: true, unique: true, index: true},
    email: {type: String, required: false, sparse: true, index: true},
    name: {type: String, required: false},
    roles: {type: [String], enum: ['Admin', 'Booker', 'Payment_Admin'], required: true, default: []},
    lastSeen: {type: Date, default: Date.now},
    createdAt: {type: Date, default: Date.now}
}, {
    timestamps: true
});

// Create compound index for efficient queries
UserSchema.index({ fasttrakId: 1, lastSeen: -1 });

export const RtrUser = mongoose.models.RtrUser || mongoose.model<IRtrUser>('RtrUser', UserSchema);
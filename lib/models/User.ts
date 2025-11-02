import mongoose, { Schema, Document } from "mongoose";

/**
 * User roles managed by RTR system (not FastTrak)
 */
export type Role = 'Admin' | 'Booker' | 'Payment_Admin' | 'Viewer';

/**
 * User status
 */
export type UserStatus = 'active' | 'inactive' | 'suspended';

/**
 * RTR User interface extending Mongoose Document
 */
export interface IRtrUser extends Document {
    fasttrakId: string;
    username: string;
    email?: string;
    name?: string;
    roles: Role[]; // RTR-managed roles
    status: UserStatus;
    isActive: boolean;
    createdBy?: string; // Admin user ID who created this user
    lastSeen?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const UserSchema = new Schema<IRtrUser>({
    fasttrakId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    email: {
        type: String,
        required: false,
        sparse: true,
        index: true,
        lowercase: true,
        trim: true,
    },
    name: {
        type: String,
        required: false,
        trim: true,
    },
    roles: {
        type: [String],
        enum: ['Admin', 'Booker', 'Payment_Admin', 'Viewer'],
        required: true,
        default: ['Viewer'],
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active',
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    createdBy: {
        type: String,
        required: false,
        index: true,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Indexes for efficient queries
UserSchema.index({ fasttrakId: 1, lastSeen: -1 });
UserSchema.index({ status: 1, isActive: 1 });
UserSchema.index({ roles: 1 });
UserSchema.index({ createdBy: 1, createdAt: -1 });

// Pre-save middleware to update isActive based on status
UserSchema.pre('save', function(next) {
    this.isActive = this.status === 'active';
    next();
});

export const RtrUser = mongoose.models.RtrUser || mongoose.model<IRtrUser>('RtrUser', UserSchema);
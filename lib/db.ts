import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rtr';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend global type to include our cache
declare global {
  var _mongo: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongo || { conn: null, promise: null };
if (!global._mongo) {
  global._mongo = cached;
}

export async function connectToDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);

        cached.conn = await cached.promise;
        return cached.conn;
    }
}
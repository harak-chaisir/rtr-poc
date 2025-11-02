import mongoose from "mongoose";
import { config } from "@/lib/config";

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
        cached.promise = mongoose.connect(config.mongodbUri).then((mongoose) => mongoose);

        cached.conn = await cached.promise;
        return cached.conn;
    }
}
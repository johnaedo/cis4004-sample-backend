// server/config/database.js
import mongoose from "mongoose";
import './dotenv.js';

mongoose.set("strictQuery", true);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in the environment");
  }

  await mongoose.connect(uri);
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

export { mongoose };
export default mongoose;

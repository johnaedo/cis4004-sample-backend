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
  console.log(`🗄️  MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

export { mongoose };
export default mongoose;

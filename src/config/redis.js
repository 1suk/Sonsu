import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || "localhost"}:${
    process.env.REDIS_PORT || 6379
  }`,
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

await redisClient.connect();

export default redisClient;

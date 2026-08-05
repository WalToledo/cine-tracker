import "./lib/env";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import movieRoutes from "./routes/movies.routes";
import reviewRoutes from "./routes/review.routes";
import userRoutes from "./routes/user.routes";
import watchlistRoutes from "./routes/watchlist.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/reviews", reviewRoutes);

export default app;

import express from "express";
import cors from "cors";
import { transactionsRouter } from "./transactions.js";
import { projectsRouter } from "./projects.js";
import { walletsRouter } from "./wallets.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
  })
);
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/transactions", transactionsRouter);
app.use("/projects", projectsRouter);
app.use("/wallets", walletsRouter);

const port = Number(process.env.PORT ?? 5176);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});

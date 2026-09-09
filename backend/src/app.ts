import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { countryRouter } from "./modules/countries/country.routes";
import { departmentRouter } from "./modules/departments/department.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/countries", countryRouter);
  app.use("/departments", departmentRouter);

  app.use(errorHandler);

  return app;
}

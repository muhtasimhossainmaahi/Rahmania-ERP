import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import { agentRouter } from "./modules/agents/agent.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { candidateRouter } from "./modules/candidates/candidate.routes";
import { companyRouter } from "./modules/companies/company.routes";
import { countryRouter } from "./modules/countries/country.routes";
import { demandRouter } from "./modules/demands/demand.routes";
import { departmentRouter } from "./modules/departments/department.routes";
import { fileRouter } from "./modules/files/file.routes";

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
  app.use("/files", fileRouter);
  app.use("/companies", companyRouter);
  app.use("/agents", agentRouter);
  app.use("/demands", demandRouter);
  app.use("/candidates", candidateRouter);

  app.use(errorHandler);

  return app;
}

import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { customerRouter } from "./modules/customers/customer.routes";
import { productRouter } from "./modules/products/product.routes";
import { supplierRouter } from "./modules/suppliers/supplier.routes";
import { warehouseRouter } from "./modules/warehouses/warehouse.routes";

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
  app.use("/customers", customerRouter);
  app.use("/suppliers", supplierRouter);
  app.use("/products", productRouter);
  app.use("/warehouses", warehouseRouter);

  app.use(errorHandler);

  return app;
}

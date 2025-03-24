import { Application } from "express";
import { setupApp } from "../app";
import { setupDb } from "../db";

describe("Create Candidate", () => {
  let app: Application;

  beforeAll(async () => {
    const db = await setupDb();
    app = await setupApp(db);
  });

  it("should create a new candidate successfully", async () => {});
});

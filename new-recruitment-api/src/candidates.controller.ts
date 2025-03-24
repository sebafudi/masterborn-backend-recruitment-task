import { Request, Response, Router } from "express";
import sqlite3 from "sqlite3";
import { Database } from "sqlite";
import { CandidatesService, UserServiceError } from "./candidates.service";

export class CandidatesController {
  readonly router = Router();
  private readonly candidatesService: CandidatesService;

  constructor(db: Database<sqlite3.Database, sqlite3.Statement>) {
    this.candidatesService = new CandidatesService(db);
    this.router.get("/candidates", this.getAll.bind(this));
    this.router.post("/candidates", this.create.bind(this));
  }

  async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.candidatesService.getAll(page, limit);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Database error" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const result = await this.candidatesService.create(req.body);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof UserServiceError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ error: "Database error" });
    }
  }
}

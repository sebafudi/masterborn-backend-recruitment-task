import {
  CandidatesService,
  Candidate,
  UserServiceError,
} from "../candidates.service";
import { setupDb } from "../db";
import { Database } from "sqlite";
import sqlite3 from "sqlite3";

describe("CandidatesService", () => {
  let db: Database<sqlite3.Database, sqlite3.Statement>;
  let candidatesService: CandidatesService;

  // Mock global fetch function
  global.fetch = jest.fn();

  beforeAll(async () => {
    db = await setupDb();
    candidatesService = new CandidatesService(db);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const validCandidate: Candidate = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "123-456-789",
      yearsOfExperience: 5,
      additionalRecruiterNotes: "Great candidate",
      recruitmentStatus: "new",
      dateOfConsentForRecruitment: new Date("2024-03-24"),
    };

    const mockSuccessResponse = {
      ok: true,
      status: 201,
      json: async () => ({ message: "Candidate added successfully" }),
    };

    it("should create a candidate successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse);

      await db.run(`
        INSERT INTO JobOffer (title, description, salary_range, location) 
        VALUES ('Test Job', 'Description', '$50k-$70k', 'Remote')
      `);

      const result = await candidatesService.create(validCandidate);

      expect(result).toHaveProperty(
        "message",
        "Candidate created successfully"
      );
      expect(result).toHaveProperty("candidate");
      expect(result.candidate).toHaveProperty(
        "firstName",
        validCandidate.firstName
      );
      expect(result.candidate).toHaveProperty(
        "lastName",
        validCandidate.lastName
      );
      expect(result.candidate).toHaveProperty("email", validCandidate.email);
      expect(result.candidate).toHaveProperty("jobOffers");
      expect(Array.isArray(result.candidate.jobOffers)).toBeTruthy();
      expect(result.candidate.jobOffers!.length).toBeGreaterThanOrEqual(1);
      expect(result.candidate.jobOffers!.length).toBeLessThanOrEqual(3);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/candidates"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-API-KEY": expect.any(String),
          }),
          body: JSON.stringify({
            firstName: validCandidate.firstName,
            lastName: validCandidate.lastName,
            email: validCandidate.email,
          }),
        })
      );
    });

    it("should throw error when required fields are missing", async () => {
      const invalidCandidate = { ...validCandidate, firstName: "" };

      await expect(candidatesService.create(invalidCandidate)).rejects.toThrow(
        UserServiceError
      );

      await expect(candidatesService.create(invalidCandidate)).rejects.toEqual(
        expect.objectContaining({
          message: "First name is required",
          status: 422,
        })
      );
    });

    it("should throw error when email format is invalid", async () => {
      const invalidCandidate = {
        ...validCandidate,
        email: "invalid-email",
      };

      await expect(candidatesService.create(invalidCandidate)).rejects.toThrow(
        UserServiceError
      );

      await expect(candidatesService.create(invalidCandidate)).rejects.toEqual(
        expect.objectContaining({
          message: "Invalid email format",
          status: 422,
        })
      );
    });

    it("should retry when legacy API returns 504", async () => {
      const timeoutResponse = {
        ok: false,
        status: 504,
        json: async () => ({ message: "Service unavailable" }),
      };

      const successResponse = {
        ok: true,
        status: 201,
        json: async () => ({ message: "Candidate added successfully" }),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(timeoutResponse)
        .mockResolvedValueOnce(successResponse);

      const newCandidate = {
        ...validCandidate,
        email: "retry@example.com",
      };

      const result = await candidatesService.create(newCandidate);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      expect(result).toHaveProperty(
        "message",
        "Candidate created successfully"
      );
    });
  });
});

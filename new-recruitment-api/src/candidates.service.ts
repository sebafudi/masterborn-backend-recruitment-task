import sqlite3 from "sqlite3";
import { Database } from "sqlite";

export type RecruitmentStatus =
  | "new"
  | "in interviews"
  | "accepted"
  | "rejected";

export interface Candidate {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  yearsOfExperience?: number;
  additionalRecruiterNotes?: string;
  recruitmentStatus?: RecruitmentStatus;
  dateOfConsentForRecruitment?: Date;
  createdAt?: string;
  jobOffers?: Offer[];
}

export interface Offer {
  title: string;
  description: string;
  salaryRange: string;
  location: string;
}

export interface DbOffer {
  title: string;
  description: string;
  salary_range: string;
  location: string;
}

export interface DbCandidate {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  years_of_experience?: number;
  additional_recruiter_notes?: string;
  recruitment_status?: RecruitmentStatus;
  date_of_consent_for_recruitment?: Date;
  created_at?: string;
}

export class UserServiceError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export class CandidatesService {
  constructor(
    private readonly db: Database<sqlite3.Database, sqlite3.Statement>
  ) {}

  private mapCandidateToCamelCase(dbObject: DbCandidate): Candidate {
    return {
      firstName: dbObject.first_name,
      lastName: dbObject.last_name,
      email: dbObject.email,
      phone: dbObject.phone,
      yearsOfExperience: dbObject.years_of_experience,
      additionalRecruiterNotes: dbObject.additional_recruiter_notes,
      recruitmentStatus: dbObject.recruitment_status,
      dateOfConsentForRecruitment: dbObject.date_of_consent_for_recruitment,
      createdAt: dbObject.created_at,
      jobOffers: [],
    };
  }

  private mapOfferToCamelCase(dbObject: DbOffer): Offer {
    return {
      title: dbObject.title,
      description: dbObject.description,
      salaryRange: dbObject.salary_range,
      location: dbObject.location,
    };
  }

  async getAll(page: number, limit: number) {
    const offset = (page - 1) * limit;

    const { total } = await this.db.get(
      "SELECT COUNT(*) as total FROM candidate"
    );

    if (total === 0 || offset >= total) {
      return {
        data: [],
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 0),
        },
      };
    }

    const candidates = (
      await this.db.all(
        `SELECT * FROM candidate LIMIT ? OFFSET ?`,
        limit,
        offset
      )
    ).map(this.mapCandidateToCamelCase);

    const candidatesWithJobOffers = await Promise.all(
      candidates.map(async (candidate) => {
        const jobOfferIds = await this.db.all(
          `SELECT * FROM JobOffer WHERE id IN (SELECT job_offer_id FROM CandidateJobOffers WHERE candidate_email = ?)`,
          candidate.email
        );
        return {
          ...candidate,
          jobOffers: jobOfferIds.map(this.mapOfferToCamelCase),
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: candidatesWithJobOffers,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
  async create(candidateData: Candidate) {
    this.validateUser(candidateData);

    await this.checkForExistingCandidate(candidateData);

    if (!candidateData.recruitmentStatus) {
      candidateData.recruitmentStatus = "new";
    } else if (
      !["new", "in interviews", "accepted", "rejected"].includes(
        candidateData.recruitmentStatus
      )
    ) {
      throw new UserServiceError("Invalid recruitment status", 422);
    }

    const jobOffers = await this.db.all(`SELECT id FROM JobOffer`);

    if (jobOffers.length === 0) {
      throw new UserServiceError("No job offers available in the system", 500);
    }
    const numberOfOffers = Math.floor(Math.random() * 3) + 1; // Random number between 1 and 3
    const selectedJobOffers = [];
    const usedIndices = new Set();

    while (selectedJobOffers.length < numberOfOffers) {
      const randomIndex = Math.floor(Math.random() * jobOffers.length);
      if (!usedIndices.has(randomIndex)) {
        selectedJobOffers.push(jobOffers[randomIndex]);
        usedIndices.add(randomIndex);
      }
    }

    await this.db.run("BEGIN TRANSACTION");

    try {
      await this.db.run(
        `INSERT INTO candidate (
            first_name, 
            last_name, 
            email, 
            phone, 
            years_of_experience, 
            additional_recruiter_notes, 
            recruitment_status,
            date_of_consent_for_recruitment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidateData.firstName,
          candidateData.lastName,
          candidateData.email,
          candidateData.phone || null,
          candidateData.yearsOfExperience || null,
          candidateData.additionalRecruiterNotes || null,
          candidateData.recruitmentStatus,
          candidateData.dateOfConsentForRecruitment || null,
        ]
      );

      for (const offer of selectedJobOffers) {
        await this.db.run(
          `INSERT INTO CandidateJobOffers (candidate_email, job_offer_id) VALUES (?, ?)`,
          [candidateData.email, offer.id]
        );
      }

      await this.db.run("COMMIT");

      const dbCandidate = await this.db.get(
        "SELECT * FROM candidate WHERE email = ?",
        candidateData.email
      );

      const candidate = this.mapCandidateToCamelCase(dbCandidate);

      const jobOfferIds = await this.db.all(
        `SELECT * FROM JobOffer WHERE id IN (SELECT job_offer_id FROM CandidateJobOffers WHERE candidate_email = ?)`,
        candidate.email
      );
      const candidateWithJobOffers = {
        ...candidate,
        jobOffers: jobOfferIds.map(this.mapOfferToCamelCase),
      };

      return {
        message: "Candidate created successfully",
        candidate: candidateWithJobOffers,
      };
    } catch (error) {
      await this.db.run("ROLLBACK");
      throw error;
    }
  }

  private async checkForExistingCandidate(candidateData: Candidate) {
    const existingCandidate = await this.db.get(
      "SELECT email FROM candidate WHERE email = ?",
      candidateData.email
    );

    if (existingCandidate) {
      throw new UserServiceError(
        "Candidate with this email already exists",
        409
      );
    }
  }

  private validateUser(candidateData: Candidate) {
    if (!candidateData.firstName) {
      throw new UserServiceError("First name is required", 422);
    }

    if (!candidateData.lastName) {
      throw new UserServiceError("Last name is required", 422);
    }

    if (!candidateData.email) {
      throw new UserServiceError("Email is required", 422);
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(candidateData.email)) {
      throw new UserServiceError("Invalid email format", 422);
    }
  }
}

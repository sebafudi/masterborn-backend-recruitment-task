CREATE TABLE CandidateJobOffers (
  candidate_email TEXT NOT NULL,
  job_offer_id INTEGER NOT NULL,
  PRIMARY KEY (candidate_email, job_offer_id),
  FOREIGN KEY (candidate_email) REFERENCES Candidate(email) ON DELETE CASCADE,
  FOREIGN KEY (job_offer_id) REFERENCES JobOffer(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_candidate_job_offers_email ON CandidateJobOffers(candidate_email);
CREATE INDEX idx_candidate_job_offers_job_id ON CandidateJobOffers(job_offer_id);
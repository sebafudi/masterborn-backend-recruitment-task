CREATE TABLE Candidate (
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  years_of_experience INTEGER,
  additional_recruiter_notes TEXT,
  recruitment_status TEXT CHECK (recruitment_status IN ('new', 'in interviews', 'accepted', 'rejected')),
  date_of_consent_for_recruitment DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
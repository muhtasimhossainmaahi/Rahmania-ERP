-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'MANAGEMENT', 'OPERATIONS', 'MARKETING', 'EMBASSY', 'MANPOWER', 'ACCOUNTS', 'MEDICAL_REP', 'AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('SOURCED', 'REGISTERED', 'DOCUMENT_VERIFICATION', 'CV_READY', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'CONTRACT', 'VISA_PROCESSING', 'VISA_RECEIVED', 'MOFA_EMBASSY', 'MEDICAL', 'POLICE_CLEARANCE', 'BMET_MANPOWER', 'TICKETING', 'READY_TO_DEPART', 'DEPARTED', 'ON_HOLD', 'REJECTED', 'CANCELLED', 'VISA_REJECTED', 'MEDICAL_UNFIT', 'PASSPORT_ISSUE', 'DOCUMENT_REJECTED', 'BMET_REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "InterviewResult" AS ENUM ('SELECTED', 'REJECTED', 'HOLD', 'SECOND_INTERVIEW', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "InterviewAttendance" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "CandidateDocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employee_code" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "role" "Role" NOT NULL,
    "department_id" TEXT,
    "designation" TEXT,
    "manager_id" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_id" TEXT,
    "mandatory_flag" BOOLEAN NOT NULL DEFAULT false,
    "expiry_required" BOOLEAN NOT NULL DEFAULT false,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "setting_key" TEXT NOT NULL,
    "setting_value" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_registry" (
    "id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "file_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "company_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "address" TEXT,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "registration_no" TEXT,
    "agreement_file_id" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "agent_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "contact_person" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "commission_terms" TEXT,
    "agreement_file_id" TEXT,
    "user_id" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demands" (
    "id" TEXT NOT NULL,
    "demand_no" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "DemandStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,

    CONSTRAINT "demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_positions" (
    "id" TEXT NOT NULL,
    "demand_id" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "required_qty" INTEGER NOT NULL,
    "salary" DECIMAL(65,30),
    "currency" TEXT,
    "accommodation" TEXT,
    "food" TEXT,
    "working_hours" TEXT,
    "benefits" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "demand_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "candidate_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "father_name" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "marital_status" TEXT,
    "mobile" TEXT,
    "alt_mobile" TEXT,
    "address" TEXT,
    "passport_no" TEXT NOT NULL,
    "passport_issue" TIMESTAMP(3),
    "passport_expiry" TIMESTAMP(3),
    "profession" TEXT,
    "experience_years" INTEGER,
    "education" TEXT,
    "source" TEXT,
    "agent_id" TEXT,
    "demand_id" TEXT,
    "position_id" TEXT,
    "assigned_employee_id" TEXT,
    "current_status" "CandidateStatus" NOT NULL DEFAULT 'REGISTERED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visas" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "visa_no" TEXT,
    "visa_type" TEXT,
    "profession" TEXT,
    "sponsor" TEXT,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "file_id" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mofa_records" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "mofa_no" TEXT,
    "submission_date" TIMESTAMP(3),
    "approval_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "file_id" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mofa_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embassy_records" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "appointment_date" TIMESTAMP(3),
    "submission_date" TIMESTAMP(3),
    "collection_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "file_id" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embassy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "contract_no" TEXT NOT NULL,
    "contract_date" TIMESTAMP(3) NOT NULL,
    "salary" DECIMAL(65,30),
    "currency" TEXT,
    "duration" TEXT,
    "file_id" TEXT,
    "signed_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_events" (
    "id" TEXT NOT NULL,
    "event_code" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "demand_id" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "interviewer" TEXT,
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "interview_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_candidates" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "serial_no" INTEGER NOT NULL,
    "attendance" "InterviewAttendance",
    "result" "InterviewResult",
    "score" DECIMAL(65,30),
    "remarks" TEXT,

    CONSTRAINT "interview_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passport_movements" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "from_user_id" TEXT,
    "to_user_id" TEXT,
    "from_location" TEXT,
    "to_location" TEXT,
    "handed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_at" TIMESTAMP(3),
    "purpose" TEXT,
    "acknowledgement_file" TEXT,
    "remarks" TEXT,

    CONSTRAINT "passport_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_documents" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "document_type_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" "CandidateDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_by" TEXT NOT NULL,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_status_history" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "old_status" "CandidateStatus",
    "new_status" "CandidateStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "candidate_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_code_key" ON "users"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "settings_setting_key_key" ON "settings"("setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "file_registry_storage_key_key" ON "file_registry"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "companies_company_code_key" ON "companies"("company_code");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agents_agent_code_key" ON "agents"("agent_code");

-- CreateIndex
CREATE UNIQUE INDEX "agents_user_id_key" ON "agents"("user_id");

-- CreateIndex
CREATE INDEX "agents_name_idx" ON "agents"("name");

-- CreateIndex
CREATE UNIQUE INDEX "demands_demand_no_key" ON "demands"("demand_no");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_candidate_code_key" ON "candidates"("candidate_code");

-- CreateIndex
CREATE INDEX "candidates_passport_no_idx" ON "candidates"("passport_no");

-- CreateIndex
CREATE INDEX "candidates_current_status_idx" ON "candidates"("current_status");

-- CreateIndex
CREATE INDEX "candidates_agent_id_idx" ON "candidates"("agent_id");

-- CreateIndex
CREATE INDEX "candidates_demand_id_idx" ON "candidates"("demand_id");

-- CreateIndex
CREATE INDEX "visas_candidate_id_idx" ON "visas"("candidate_id");

-- CreateIndex
CREATE INDEX "mofa_records_candidate_id_idx" ON "mofa_records"("candidate_id");

-- CreateIndex
CREATE INDEX "embassy_records_candidate_id_idx" ON "embassy_records"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_candidate_id_key" ON "contracts"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_no_key" ON "contracts"("contract_no");

-- CreateIndex
CREATE UNIQUE INDEX "interview_events_event_code_key" ON "interview_events"("event_code");

-- CreateIndex
CREATE INDEX "interview_candidates_event_id_idx" ON "interview_candidates"("event_id");

-- CreateIndex
CREATE INDEX "interview_candidates_candidate_id_idx" ON "interview_candidates"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_candidates_event_id_candidate_id_key" ON "interview_candidates"("event_id", "candidate_id");

-- CreateIndex
CREATE INDEX "passport_movements_candidate_id_idx" ON "passport_movements"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_documents_candidate_id_idx" ON "candidate_documents"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_documents_candidate_id_document_type_id_idx" ON "candidate_documents"("candidate_id", "document_type_id");

-- CreateIndex
CREATE INDEX "candidate_status_history_candidate_id_idx" ON "candidate_status_history"("candidate_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_agreement_file_id_fkey" FOREIGN KEY ("agreement_file_id") REFERENCES "file_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_agreement_file_id_fkey" FOREIGN KEY ("agreement_file_id") REFERENCES "file_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demands" ADD CONSTRAINT "demands_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_positions" ADD CONSTRAINT "demand_positions_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "demands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "demands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "demand_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visas" ADD CONSTRAINT "visas_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visas" ADD CONSTRAINT "visas_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mofa_records" ADD CONSTRAINT "mofa_records_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mofa_records" ADD CONSTRAINT "mofa_records_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embassy_records" ADD CONSTRAINT "embassy_records_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embassy_records" ADD CONSTRAINT "embassy_records_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_events" ADD CONSTRAINT "interview_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_events" ADD CONSTRAINT "interview_events_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "demands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_candidates" ADD CONSTRAINT "interview_candidates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "interview_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_candidates" ADD CONSTRAINT "interview_candidates_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passport_movements" ADD CONSTRAINT "passport_movements_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passport_movements" ADD CONSTRAINT "passport_movements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passport_movements" ADD CONSTRAINT "passport_movements_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passport_movements" ADD CONSTRAINT "passport_movements_acknowledgement_file_fkey" FOREIGN KEY ("acknowledgement_file") REFERENCES "file_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_registry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_status_history" ADD CONSTRAINT "candidate_status_history_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_status_history" ADD CONSTRAINT "candidate_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

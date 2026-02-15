-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admission_schedules (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  date date NOT NULL UNIQUE,
  venue text,
  slots integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT admission_schedules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.answers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  submission_id bigint,
  question_id bigint,
  answer_value integer,
  answer_text text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT answers_pkey PRIMARY KEY (id),
  CONSTRAINT answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reference_id text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  email text NOT NULL UNIQUE,
  mobile text NOT NULL,
  priority_course text NOT NULL,
  test_date date NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  status text DEFAULT 'Submitted'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  civil_status text,
  nationality text,
  reason text,
  street text,
  city text,
  province text,
  zip_code text,
  alt_course_1 text,
  alt_course_2 text,
  alt_course_3 text,
  student_id text,
  suffix text,
  place_of_birth text,
  age integer,
  sex text,
  gender_identity text,
  facebook_url text,
  school_last_attended text,
  year_level_applying text,
  is_working_student boolean DEFAULT false,
  working_student_type text,
  supporter text,
  supporter_contact text,
  is_pwd boolean DEFAULT false,
  pwd_type text,
  is_indigenous boolean DEFAULT false,
  indigenous_group text,
  witnessed_conflict boolean DEFAULT false,
  is_solo_parent boolean DEFAULT false,
  is_child_of_solo_parent boolean DEFAULT false,
  dob date,
  CONSTRAINT applications_pkey PRIMARY KEY (id),
  CONSTRAINT applications_priority_course_fkey FOREIGN KEY (priority_course) REFERENCES public.courses(name),
  CONSTRAINT applications_alt_course_1_fkey FOREIGN KEY (alt_course_1) REFERENCES public.courses(name),
  CONSTRAINT applications_alt_course_2_fkey FOREIGN KEY (alt_course_2) REFERENCES public.courses(name),
  CONSTRAINT applications_test_date_fkey FOREIGN KEY (test_date) REFERENCES public.admission_schedules(date),
  CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_name text,
  action text,
  details text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.counseling_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  student_id text,
  student_name text,
  request_type text,
  description text,
  status text DEFAULT 'Pending'::text,
  scheduled_date timestamp with time zone,
  department text,
  resolution_notes text,
  confidential_notes text,
  feedback text,
  rating integer,
  CONSTRAINT counseling_requests_pkey PRIMARY KEY (id),
  CONSTRAINT counseling_requests_department_fkey FOREIGN KEY (department) REFERENCES public.departments(name),
  CONSTRAINT counseling_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.courses (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  department_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  capacity integer DEFAULT 100,
  application_limit integer DEFAULT 200,
  status text DEFAULT 'Open'::text,
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.departments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.enrolled_students (
  student_id text NOT NULL UNIQUE,
  is_used boolean DEFAULT false,
  assigned_to_email text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  course text,
  status text DEFAULT 'Pending'::text,
  CONSTRAINT enrolled_students_pkey PRIMARY KEY (student_id),
  CONSTRAINT enrolled_students_course_fkey FOREIGN KEY (course) REFERENCES public.courses(name)
);
CREATE TABLE public.event_attendance (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  event_id bigint,
  student_id text NOT NULL,
  student_name text,
  checked_in_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  time_in timestamp with time zone,
  time_out timestamp with time zone,
  proof_url text,
  latitude double precision,
  longitude double precision,
  department text,
  CONSTRAINT event_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT event_attendance_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_attendance_department_fkey FOREIGN KEY (department) REFERENCES public.departments(name),
  CONSTRAINT event_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.event_feedback (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  event_id bigint,
  student_id text NOT NULL,
  student_name text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT event_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT event_feedback_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_feedback_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  title text NOT NULL,
  type text NOT NULL,
  description text,
  location text,
  event_date date,
  event_time text,
  attendees bigint DEFAULT 0,
  end_time time without time zone,
  latitude double precision,
  longitude double precision,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.forms (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT forms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.needs_assessments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  student_id text,
  age integer,
  gender text,
  year_level text,
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT needs_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_needs_assessments_students FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.office_visit_reasons (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  reason text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT office_visit_reasons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.office_visits (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id text,
  student_name text,
  reason text,
  time_in timestamp with time zone DEFAULT now(),
  time_out timestamp with time zone,
  status text DEFAULT 'Ongoing'::text,
  CONSTRAINT office_visits_pkey PRIMARY KEY (id),
  CONSTRAINT office_visits_reason_fkey FOREIGN KEY (reason) REFERENCES public.office_visit_reasons(reason),
  CONSTRAINT office_visits_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.questions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  form_id bigint,
  question_text text NOT NULL,
  question_type text DEFAULT 'scale'::text,
  scale_min integer DEFAULT 1,
  scale_max integer DEFAULT 5,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id)
);
CREATE TABLE public.scholarship_applications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  scholarship_id bigint NOT NULL,
  student_id text NOT NULL,
  student_name text,
  course text,
  year_level text,
  contact_number text,
  email text,
  status text DEFAULT 'Applied'::text,
  CONSTRAINT scholarship_applications_pkey PRIMARY KEY (id),
  CONSTRAINT scholarship_applications_scholarship_id_fkey FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(id),
  CONSTRAINT scholarship_applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.scholarships (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  title text NOT NULL,
  deadline date,
  description text,
  requirements text,
  CONSTRAINT scholarships_pkey PRIMARY KEY (id)
);
CREATE TABLE public.staff_accounts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  full_name text,
  role text NOT NULL,
  department text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT staff_accounts_department_fkey FOREIGN KEY (department) REFERENCES public.departments(name)
);
CREATE TABLE public.students (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  first_name text NOT NULL,
  last_name text NOT NULL,
  student_id text NOT NULL UNIQUE,
  course text,
  year_level text,
  status text DEFAULT 'Active'::text,
  department text,
  middle_name text,
  dob date,
  gender text,
  civil_status text,
  nationality text,
  email text,
  mobile text,
  address text,
  emergency_contact text,
  street text,
  city text,
  province text,
  zip_code text,
  suffix text,
  place_of_birth text,
  age integer,
  sex text,
  gender_identity text,
  facebook_url text,
  school_last_attended text,
  is_working_student boolean DEFAULT false,
  working_student_type text,
  supporter text,
  supporter_contact text,
  is_pwd boolean DEFAULT false,
  pwd_type text,
  is_indigenous boolean DEFAULT false,
  indigenous_group text,
  witnessed_conflict boolean DEFAULT false,
  is_solo_parent boolean DEFAULT false,
  is_child_of_solo_parent boolean DEFAULT false,
  priority_course text,
  alt_course_1 text,
  alt_course_2 text,
  password text,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_department_fkey FOREIGN KEY (department) REFERENCES public.departments(name),
  CONSTRAINT students_course_fkey FOREIGN KEY (course) REFERENCES public.courses(name)
);
CREATE TABLE public.submissions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  form_id bigint,
  student_id text,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id),
  CONSTRAINT fk_submissions_students FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
CREATE TABLE public.support_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  student_id text NOT NULL,
  student_name text,
  department text,
  support_type text,
  description text,
  documents_url text,
  status text DEFAULT 'Submitted'::text,
  care_notes text,
  care_documents_url text,
  dept_notes text,
  resolution_notes text,
  CONSTRAINT support_requests_pkey PRIMARY KEY (id),
  CONSTRAINT support_requests_department_fkey FOREIGN KEY (department) REFERENCES public.departments(name),
  CONSTRAINT support_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id)
);
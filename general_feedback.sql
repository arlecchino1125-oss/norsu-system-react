-- Create the general_feedback table for Client Satisfaction Measurement (CSM)
CREATE TABLE IF NOT EXISTS general_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    
    -- Client Info
    client_type TEXT, -- 'Citizen', 'Business', 'Government'
    sex TEXT, -- 'Male', 'Female'
    age INTEGER,
    region TEXT,
    service_availed TEXT,
    
    -- CC Questions
    cc1 INTEGER, -- 1-4
    cc2 INTEGER, -- 1-5 (5 = N/A)
    cc3 INTEGER, -- 1-4 (4 = N/A)
    
    -- SQD Questions (0 = N/A, 1 = Strongly Disagree, 5 = Strongly Agree)
    sqd0 INTEGER,
    sqd1 INTEGER,
    sqd2 INTEGER,
    sqd3 INTEGER,
    sqd4 INTEGER,
    sqd5 INTEGER,
    sqd6 INTEGER,
    sqd7 INTEGER,
    sqd8 INTEGER,
    
    -- Open-ended
    suggestions TEXT,
    email TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE general_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert
CREATE POLICY "Students can insert feedback" ON general_feedback
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to read their own feedback
CREATE POLICY "Students can read own feedback" ON general_feedback
    FOR SELECT TO authenticated USING (true);

-- Allow service_role full access (for care staff dashboard)
CREATE POLICY "Service role full access" ON general_feedback
    FOR ALL TO service_role USING (true) WITH CHECK (true);

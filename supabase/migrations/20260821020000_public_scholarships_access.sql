-- Allow anonymous users to view active scholarships
CREATE POLICY "scholarships_anon_read_active" ON "public"."scholarships" FOR SELECT TO "anon" USING (is_active = true);

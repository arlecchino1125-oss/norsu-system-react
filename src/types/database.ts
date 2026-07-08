export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admission_schedules: {
        Row: {
          created_at: string
          date: string
          id: number
          is_active: boolean | null
          slots: number | null
          time_windows: Json
          venue: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: number
          is_active?: boolean | null
          slots?: number | null
          time_windows?: Json
          venue?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: number
          is_active?: boolean | null
          slots?: number | null
          time_windows?: Json
          venue?: string | null
        }
        Relationships: []
      }
      answers: {
        Row: {
          answer_text: string | null
          answer_value: number | null
          created_at: string | null
          id: number
          question_id: number | null
          submission_id: number | null
        }
        Insert: {
          answer_text?: string | null
          answer_value?: number | null
          created_at?: string | null
          id?: number
          question_id?: number | null
          submission_id?: number | null
        }
        Update: {
          answer_text?: string | null
          answer_value?: number | null
          created_at?: string | null
          id?: number
          question_id?: number | null
          submission_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      application_archives: {
        Row: {
          activated_course: string | null
          activated_student_id: string | null
          age: number | null
          alt_course_1: string | null
          alt_course_2: string | null
          archive_id: number
          archive_outcome: string
          archived_at: string
          archived_by: number | null
          city: string | null
          civil_status: string | null
          created_at: string
          current_choice: number | null
          dob: string | null
          email: string
          facebook_url: string | null
          first_name: string
          gender_identity: string | null
          interview_date: string | null
          interview_panel: string | null
          interview_queue_status: string | null
          interview_venue: string | null
          last_name: string
          middle_name: string | null
          mobile: string
          nat_password_hash: string | null
          nationality: string | null
          place_of_birth: string | null
          priority_course: string
          province: string | null
          reason: string | null
          reference_id: string
          sex: string | null
          source_application_id: string
          source_status: string | null
          status: string
          street: string | null
          suffix: string | null
          test_date: string | null
          test_time: string | null
          time_in: string | null
          time_out: string | null
          username: string | null
          zip_code: string | null
        }
        Insert: {
          activated_course?: string | null
          activated_student_id?: string | null
          age?: number | null
          alt_course_1?: string | null
          alt_course_2?: string | null
          archive_id?: never
          archive_outcome: string
          archived_at?: string
          archived_by?: number | null
          city?: string | null
          civil_status?: string | null
          created_at: string
          current_choice?: number | null
          dob?: string | null
          email: string
          facebook_url?: string | null
          first_name: string
          gender_identity?: string | null
          interview_date?: string | null
          interview_panel?: string | null
          interview_queue_status?: string | null
          interview_venue?: string | null
          last_name: string
          middle_name?: string | null
          mobile: string
          nat_password_hash?: string | null
          nationality?: string | null
          place_of_birth?: string | null
          priority_course: string
          province?: string | null
          reason?: string | null
          reference_id: string
          sex?: string | null
          source_application_id: string
          source_status?: string | null
          status: string
          street?: string | null
          suffix?: string | null
          test_date?: string | null
          test_time?: string | null
          time_in?: string | null
          time_out?: string | null
          username?: string | null
          zip_code?: string | null
        }
        Update: {
          activated_course?: string | null
          activated_student_id?: string | null
          age?: number | null
          alt_course_1?: string | null
          alt_course_2?: string | null
          archive_id?: never
          archive_outcome?: string
          archived_at?: string
          archived_by?: number | null
          city?: string | null
          civil_status?: string | null
          created_at?: string
          current_choice?: number | null
          dob?: string | null
          email?: string
          facebook_url?: string | null
          first_name?: string
          gender_identity?: string | null
          interview_date?: string | null
          interview_panel?: string | null
          interview_queue_status?: string | null
          interview_venue?: string | null
          last_name?: string
          middle_name?: string | null
          mobile?: string
          nat_password_hash?: string | null
          nationality?: string | null
          place_of_birth?: string | null
          priority_course?: string
          province?: string | null
          reason?: string | null
          reference_id?: string
          sex?: string | null
          source_application_id?: string
          source_status?: string | null
          status?: string
          street?: string | null
          suffix?: string | null
          test_date?: string | null
          test_time?: string | null
          time_in?: string | null
          time_out?: string | null
          username?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          age: number | null
          alt_course_1: string | null
          alt_course_2: string | null
          city: string | null
          civil_status: string | null
          created_at: string
          current_choice: number | null
          dob: string | null
          email: string
          facebook_url: string | null
          first_name: string
          gender_identity: string | null
          id: string
          interview_date: string | null
          interview_panel: string | null
          interview_queue_status: string | null
          interview_venue: string | null
          last_name: string
          middle_name: string | null
          mobile: string
          nat_password_hash: string | null
          nationality: string | null
          place_of_birth: string | null
          priority_course: string
          province: string | null
          reason: string | null
          reference_id: string
          sex: string | null
          status: string | null
          street: string | null
          suffix: string | null
          test_date: string
          test_time: string | null
          time_in: string | null
          time_out: string | null
          username: string
          zip_code: string | null
        }
        Insert: {
          age?: number | null
          alt_course_1?: string | null
          alt_course_2?: string | null
          city?: string | null
          civil_status?: string | null
          created_at?: string
          current_choice?: number | null
          dob?: string | null
          email: string
          facebook_url?: string | null
          first_name: string
          gender_identity?: string | null
          id?: string
          interview_date?: string | null
          interview_panel?: string | null
          interview_queue_status?: string | null
          interview_venue?: string | null
          last_name: string
          middle_name?: string | null
          mobile: string
          nat_password_hash?: string | null
          nationality?: string | null
          place_of_birth?: string | null
          priority_course: string
          province?: string | null
          reason?: string | null
          reference_id: string
          sex?: string | null
          status?: string | null
          street?: string | null
          suffix?: string | null
          test_date: string
          test_time?: string | null
          time_in?: string | null
          time_out?: string | null
          username: string
          zip_code?: string | null
        }
        Update: {
          age?: number | null
          alt_course_1?: string | null
          alt_course_2?: string | null
          city?: string | null
          civil_status?: string | null
          created_at?: string
          current_choice?: number | null
          dob?: string | null
          email?: string
          facebook_url?: string | null
          first_name?: string
          gender_identity?: string | null
          id?: string
          interview_date?: string | null
          interview_panel?: string | null
          interview_queue_status?: string | null
          interview_venue?: string | null
          last_name?: string
          middle_name?: string | null
          mobile?: string
          nat_password_hash?: string | null
          nationality?: string | null
          place_of_birth?: string | null
          priority_course?: string
          province?: string | null
          reason?: string | null
          reference_id?: string
          sex?: string | null
          status?: string | null
          street?: string | null
          suffix?: string | null
          test_date?: string
          test_time?: string | null
          time_in?: string | null
          time_out?: string | null
          username?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_alt_course_1_fkey"
            columns: ["alt_course_1"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "applications_alt_course_2_fkey"
            columns: ["alt_course_2"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "applications_priority_course_fkey"
            columns: ["priority_course"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "applications_test_date_fkey"
            columns: ["test_date"]
            isOneToOne: false
            referencedRelation: "admission_schedules"
            referencedColumns: ["date"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          actor_department: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          details: string | null
          entity_id: string | null
          entity_table: string | null
          id: number
          user_name: string | null
        }
        Insert: {
          action?: string | null
          actor_department?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          details?: string | null
          entity_id?: string | null
          entity_table?: string | null
          id?: number
          user_name?: string | null
        }
        Update: {
          action?: string | null
          actor_department?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          details?: string | null
          entity_id?: string | null
          entity_table?: string | null
          id?: number
          user_name?: string | null
        }
        Relationships: []
      }
      counseling_requests: {
        Row: {
          actions_made: string | null
          confidential_notes: string | null
          contact_number: string | null
          course_year: string | null
          created_at: string
          date_duration_of_concern: string | null
          date_duration_of_observations: string | null
          department: string | null
          description: string | null
          feedback: string | null
          id: number
          personal_actions_taken: string | null
          rating: number | null
          reason_for_referral: string | null
          referred_by: string | null
          referrer_contact_number: string | null
          referrer_signature: string | null
          relationship_with_student: string | null
          request_type: string | null
          resolution_notes: string | null
          scheduled_date: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
        }
        Insert: {
          actions_made?: string | null
          confidential_notes?: string | null
          contact_number?: string | null
          course_year?: string | null
          created_at?: string
          date_duration_of_concern?: string | null
          date_duration_of_observations?: string | null
          department?: string | null
          description?: string | null
          feedback?: string | null
          id?: number
          personal_actions_taken?: string | null
          rating?: number | null
          reason_for_referral?: string | null
          referred_by?: string | null
          referrer_contact_number?: string | null
          referrer_signature?: string | null
          relationship_with_student?: string | null
          request_type?: string | null
          resolution_notes?: string | null
          scheduled_date?: string | null
          status?: string | null
          student_id?: string | null
          student_name?: string | null
        }
        Update: {
          actions_made?: string | null
          confidential_notes?: string | null
          contact_number?: string | null
          course_year?: string | null
          created_at?: string
          date_duration_of_concern?: string | null
          date_duration_of_observations?: string | null
          department?: string | null
          description?: string | null
          feedback?: string | null
          id?: number
          personal_actions_taken?: string | null
          rating?: number | null
          reason_for_referral?: string | null
          referred_by?: string | null
          referrer_contact_number?: string | null
          referrer_signature?: string | null
          relationship_with_student?: string | null
          request_type?: string | null
          resolution_notes?: string | null
          scheduled_date?: string | null
          status?: string | null
          student_id?: string | null
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counseling_requests_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "counseling_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      courses: {
        Row: {
          application_limit: number | null
          capacity: number | null
          created_at: string
          department_id: number | null
          id: number
          name: string
          status: string | null
        }
        Insert: {
          application_limit?: number | null
          capacity?: number | null
          created_at?: string
          department_id?: number | null
          id?: number
          name: string
          status?: string | null
        }
        Update: {
          application_limit?: number | null
          capacity?: number | null
          created_at?: string
          department_id?: number | null
          id?: number
          name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          archive_note: string | null
          archived_at: string | null
          id: number
          is_archived: boolean
          name: string
        }
        Insert: {
          archive_note?: string | null
          archived_at?: string | null
          id?: number
          is_archived?: boolean
          name: string
        }
        Update: {
          archive_note?: string | null
          archived_at?: string | null
          id?: number
          is_archived?: boolean
          name?: string
        }
        Relationships: []
      }
      edge_rate_limits: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          identifier_hash: string
          request_count: number
          scope: string
          updated_at: string
          window_starts_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          identifier_hash: string
          request_count?: number
          scope: string
          updated_at?: string
          window_starts_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          identifier_hash?: string
          request_count?: number
          scope?: string
          updated_at?: string
          window_starts_at?: string
        }
        Relationships: []
      }
      enrolled_students: {
        Row: {
          assigned_to_email: string | null
          course: string | null
          created_at: string
          is_used: boolean | null
          status: string | null
          student_id: string
          year_level: string | null
        }
        Insert: {
          assigned_to_email?: string | null
          course?: string | null
          created_at?: string
          is_used?: boolean | null
          status?: string | null
          student_id: string
          year_level?: string | null
        }
        Update: {
          assigned_to_email?: string | null
          course?: string | null
          created_at?: string
          is_used?: boolean | null
          status?: string | null
          student_id?: string
          year_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrolled_students_course_fkey"
            columns: ["course"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["name"]
          },
        ]
      }
      event_attendance: {
        Row: {
          checked_in_at: string | null
          department: string | null
          event_id: number | null
          id: number
          latitude: number | null
          longitude: number | null
          proof_url: string | null
          student_id: string
          student_name: string | null
          time_in: string | null
          time_out: string | null
        }
        Insert: {
          checked_in_at?: string | null
          department?: string | null
          event_id?: number | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          proof_url?: string | null
          student_id: string
          student_name?: string | null
          time_in?: string | null
          time_out?: string | null
        }
        Update: {
          checked_in_at?: string | null
          department?: string | null
          event_id?: number | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          proof_url?: string | null
          student_id?: string
          student_name?: string | null
          time_in?: string | null
          time_out?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          college: string | null
          date_of_activity: string | null
          event_id: number | null
          feedback: string | null
          id: number
          open_best: string | null
          open_comments: string | null
          open_suggestions: string | null
          q1_score: number | null
          q2_score: number | null
          q3_score: number | null
          q4_score: number | null
          q5_score: number | null
          q6_score: number | null
          q7_score: number | null
          rating: number | null
          sex: string | null
          student_id: string
          student_name: string | null
          submitted_at: string | null
        }
        Insert: {
          college?: string | null
          date_of_activity?: string | null
          event_id?: number | null
          feedback?: string | null
          id?: number
          open_best?: string | null
          open_comments?: string | null
          open_suggestions?: string | null
          q1_score?: number | null
          q2_score?: number | null
          q3_score?: number | null
          q4_score?: number | null
          q5_score?: number | null
          q6_score?: number | null
          q7_score?: number | null
          rating?: number | null
          sex?: string | null
          student_id: string
          student_name?: string | null
          submitted_at?: string | null
        }
        Update: {
          college?: string | null
          date_of_activity?: string | null
          event_id?: number | null
          feedback?: string | null
          id?: number
          open_best?: string | null
          open_comments?: string | null
          open_suggestions?: string | null
          q1_score?: number | null
          q2_score?: number | null
          q3_score?: number | null
          q4_score?: number | null
          q5_score?: number | null
          q6_score?: number | null
          q7_score?: number | null
          rating?: number | null
          sex?: string | null
          student_id?: string
          student_name?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          cancelled_at: string | null
          course: string | null
          department: string | null
          email: string | null
          event_id: number
          id: number
          registered_at: string
          section: string | null
          status: string
          student_id: string
          student_name: string | null
          updated_at: string
          year_level: string | null
        }
        Insert: {
          cancelled_at?: string | null
          course?: string | null
          department?: string | null
          email?: string | null
          event_id: number
          id?: never
          registered_at?: string
          section?: string | null
          status?: string
          student_id: string
          student_name?: string | null
          updated_at?: string
          year_level?: string | null
        }
        Update: {
          cancelled_at?: string | null
          course?: string | null
          department?: string | null
          email?: string | null
          event_id?: number
          id?: never
          registered_at?: string
          section?: string | null
          status?: string
          student_id?: string
          student_name?: string | null
          updated_at?: string
          year_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      events: {
        Row: {
          allow_walk_ins: boolean
          archived_at: string | null
          archived_by: number | null
          attendance_required: boolean
          attendees: number | null
          audience_courses: string[]
          audience_departments: string[]
          audience_sections: string[]
          audience_type: string
          audience_year_levels: string[]
          capacity: number | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string | null
          event_time: string | null
          id: number
          is_archived: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          participation_mode: string
          registration_deadline: string | null
          title: string
          type: string
        }
        Insert: {
          allow_walk_ins?: boolean
          archived_at?: string | null
          archived_by?: number | null
          attendance_required?: boolean
          attendees?: number | null
          audience_courses?: string[]
          audience_departments?: string[]
          audience_sections?: string[]
          audience_type?: string
          audience_year_levels?: string[]
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: number
          is_archived?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          participation_mode?: string
          registration_deadline?: string | null
          title: string
          type: string
        }
        Update: {
          allow_walk_ins?: boolean
          archived_at?: string | null
          archived_by?: number | null
          attendance_required?: boolean
          attendees?: number | null
          audience_courses?: string[]
          audience_departments?: string[]
          audience_sections?: string[]
          audience_type?: string
          audience_year_levels?: string[]
          capacity?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string | null
          event_time?: string | null
          id?: number
          is_archived?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          participation_mode?: string
          registration_deadline?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_active: boolean | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      general_feedback: {
        Row: {
          age: number | null
          cc1: number | null
          cc2: number | null
          cc3: number | null
          client_type: string | null
          created_at: string | null
          email: string | null
          id: string
          region: string | null
          service_availed: string | null
          sex: string | null
          sqd0: number | null
          sqd1: number | null
          sqd2: number | null
          sqd3: number | null
          sqd4: number | null
          sqd5: number | null
          sqd6: number | null
          sqd7: number | null
          sqd8: number | null
          student_id: string
          student_name: string
          suggestions: string | null
        }
        Insert: {
          age?: number | null
          cc1?: number | null
          cc2?: number | null
          cc3?: number | null
          client_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          region?: string | null
          service_availed?: string | null
          sex?: string | null
          sqd0?: number | null
          sqd1?: number | null
          sqd2?: number | null
          sqd3?: number | null
          sqd4?: number | null
          sqd5?: number | null
          sqd6?: number | null
          sqd7?: number | null
          sqd8?: number | null
          student_id: string
          student_name: string
          suggestions?: string | null
        }
        Update: {
          age?: number | null
          cc1?: number | null
          cc2?: number | null
          cc3?: number | null
          client_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          region?: string | null
          service_availed?: string | null
          sex?: string | null
          sqd0?: number | null
          sqd1?: number | null
          sqd2?: number | null
          sqd3?: number | null
          sqd4?: number | null
          sqd5?: number | null
          sqd6?: number | null
          sqd7?: number | null
          sqd8?: number | null
          student_id?: string
          student_name?: string
          suggestions?: string | null
        }
        Relationships: []
      }
      nat_requirements: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: number
          is_read: boolean | null
          message: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          message: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_read?: boolean | null
          message?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      office_visit_reasons: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          reason: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          reason: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          reason?: string
        }
        Relationships: []
      }
      office_visits: {
        Row: {
          id: number
          reason: string | null
          status: string | null
          student_id: string | null
          student_name: string | null
          time_in: string | null
          time_out: string | null
        }
        Insert: {
          id?: number
          reason?: string | null
          status?: string | null
          student_id?: string | null
          student_name?: string | null
          time_in?: string | null
          time_out?: string | null
        }
        Update: {
          id?: number
          reason?: string | null
          status?: string | null
          student_id?: string | null
          student_name?: string | null
          time_in?: string | null
          time_out?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office_visits_reason_fkey"
            columns: ["reason"]
            isOneToOne: false
            referencedRelation: "office_visit_reasons"
            referencedColumns: ["reason"]
          },
          {
            foreignKeyName: "office_visits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string | null
          form_id: number | null
          id: number
          order_index: number | null
          question_text: string
          question_type: string | null
          scale_max: number | null
          scale_min: number | null
        }
        Insert: {
          created_at?: string | null
          form_id?: number | null
          id?: number
          order_index?: number | null
          question_text: string
          question_type?: string | null
          scale_max?: number | null
          scale_min?: number | null
        }
        Update: {
          created_at?: string | null
          form_id?: number | null
          id?: number
          order_index?: number | null
          question_text?: string
          question_type?: string | null
          scale_max?: number | null
          scale_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          created_by: number | null
          description: string | null
          id: string
          is_allowed: boolean
          notice_text: string | null
          permission_key: string
          permission_type: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: number | null
          description?: string | null
          id?: string
          is_allowed?: boolean
          notice_text?: string | null
          permission_key: string
          permission_type: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: number | null
          description?: string | null
          id?: string
          is_allowed?: boolean
          notice_text?: string | null
          permission_key?: string
          permission_type?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_applications: {
        Row: {
          created_at: string
          id: number
          scholarship_id: number
          status: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          scholarship_id: number
          status?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: number
          scholarship_id?: number
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_applications_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      scholarships: {
        Row: {
          created_at: string
          deadline: string | null
          description: string | null
          id: number
          is_active: boolean
          requirements: string | null
          title: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          requirements?: string | null
          title: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: number
          is_active?: boolean
          requirements?: string | null
          title?: string
        }
        Relationships: []
      }
      security_change_otps: {
        Row: {
          account_type: string
          attempt_count: number
          auth_user_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          last_attempt_at: string | null
          otp_hash: string
          purpose: string
          target_email: string
        }
        Insert: {
          account_type: string
          attempt_count?: number
          auth_user_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          last_attempt_at?: string | null
          otp_hash: string
          purpose: string
          target_email: string
        }
        Update: {
          account_type?: string
          attempt_count?: number
          auth_user_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_attempt_at?: string | null
          otp_hash?: string
          purpose?: string
          target_email?: string
        }
        Relationships: []
      }
      staff_accounts: {
        Row: {
          archive_note: string | null
          archived_at: string | null
          auth_user_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: number
          is_archived: boolean
          role: string
          username: string
        }
        Insert: {
          archive_note?: string | null
          archived_at?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: number
          is_archived?: boolean
          role: string
          username: string
        }
        Update: {
          archive_note?: string | null
          archived_at?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: number
          is_archived?: boolean
          role?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_accounts_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["name"]
          },
        ]
      }
      student_activation_settings: {
        Row: {
          id: number
          require_enrollment_key: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          require_enrollment_key?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          require_enrollment_key?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          age: number | null
          alt_course_1: string | null
          alt_course_2: string | null
          archive_note: string | null
          archived_at: string | null
          archived_by: number | null
          archived_reason: string | null
          auth_user_id: string | null
          birth_order: string | null
          birth_order_other: string | null
          children_names_birthdates: string | null
          city: string | null
          civil_status: string | null
          college_school: string | null
          college_year_graduated: string | null
          course: string | null
          course_year_archive: Json
          course_year_confirmed_at: string | null
          course_year_profile_edited: boolean | null
          course_year_update_required: boolean
          course_year_window_end: string | null
          course_year_window_start: string | null
          created_at: string
          crime_conviction_details: string | null
          criminal_charge_details: string | null
          currently_pregnant: string | null
          department: string | null
          disability_cause: string | null
          dob: string | null
          elem_school: string | null
          elem_year_graduated: string | null
          eligibility_acquired: string | null
          email: string | null
          emergency_address: string | null
          emergency_contact: string | null
          emergency_name: string | null
          emergency_number: string | null
          emergency_relationship: string | null
          employer_address: string | null
          employer_name: string | null
          extracurricular_activities: string | null
          facebook_url: string | null
          father_address: string | null
          father_contact: string | null
          father_given_name: string | null
          father_last_name: string | null
          father_middle_name: string | null
          father_name: string | null
          father_occupation: string | null
          father_status: string | null
          first_name: string
          four_ps_document_url: string | null
          gender_identity: string | null
          guardian_address: string | null
          guardian_contact: string | null
          guardian_name: string | null
          guardian_relation: string | null
          has_been_convicted_of_crime: boolean | null
          has_been_criminally_charged: boolean | null
          has_seen_tour: boolean | null
          holds_public_service_position: boolean | null
          honors_awards: string | null
          id: number
          indigenous_group: string | null
          indigenous_group_other: string | null
          ip_document_url: string | null
          is_archived: boolean
          is_child_of_solo_parent: boolean | null
          is_four_ps_member: boolean | null
          is_homeless_citizen: boolean | null
          is_indigenous: boolean | null
          is_orphan: boolean | null
          is_pwd: boolean | null
          is_rebel_returnee: boolean | null
          is_safe_in_community: boolean | null
          is_senior_citizen: boolean | null
          is_solo_parent: boolean | null
          is_working_student: boolean | null
          junior_high_school: string | null
          junior_high_year_graduated: string | null
          last_name: string
          middle_name: string | null
          mobile: string | null
          mother_address: string | null
          mother_contact: string | null
          mother_given_name: string | null
          mother_last_name: string | null
          mother_middle_name: string | null
          mother_name: string | null
          mother_occupation: string | null
          mother_status: string | null
          nationality: string | null
          num_brothers: string | null
          num_children: string | null
          num_sisters: string | null
          organizations_memberships: string | null
          orphan_cause: string | null
          orphan_cause_other: string | null
          other_talents: string | null
          parent_address: string | null
          parents_num_children: string | null
          place_of_birth: string | null
          priority_course: string | null
          profile_completed: boolean | null
          profile_picture_url: string | null
          province: string | null
          public_service_position: string | null
          pwd_document_url: string | null
          pwd_number: string | null
          pwd_type: string | null
          pwd_type_other: string | null
          region: string | null
          region_other: string | null
          religion: string | null
          scholarships_availed: string | null
          school_last_attended: string | null
          section: string | null
          senior_citizen_document_url: string | null
          senior_high_school: string | null
          senior_high_year_graduated: string | null
          sex: string | null
          solo_parent_document_url: string | null
          special_trainings_attended: string | null
          sports_skills: string | null
          spouse_contact: string | null
          spouse_employer_address: string | null
          spouse_employer_name: string | null
          spouse_name: string | null
          spouse_occupation: string | null
          status: string | null
          street: string | null
          student_id: string
          suffix: string | null
          supporter: string | null
          supporter_contact: string | null
          tesda_nc2_acquired: string | null
          witnessed_conflict: boolean | null
          work_experiences: string | null
          working_student_type: string | null
          working_student_type_other: string | null
          year_level: string | null
          year_level_other: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          alt_course_1?: string | null
          alt_course_2?: string | null
          archive_note?: string | null
          archived_at?: string | null
          archived_by?: number | null
          archived_reason?: string | null
          auth_user_id?: string | null
          birth_order?: string | null
          birth_order_other?: string | null
          children_names_birthdates?: string | null
          city?: string | null
          civil_status?: string | null
          college_school?: string | null
          college_year_graduated?: string | null
          course?: string | null
          course_year_archive?: Json
          course_year_confirmed_at?: string | null
          course_year_profile_edited?: boolean | null
          course_year_update_required?: boolean
          course_year_window_end?: string | null
          course_year_window_start?: string | null
          created_at?: string
          crime_conviction_details?: string | null
          criminal_charge_details?: string | null
          currently_pregnant?: string | null
          department?: string | null
          disability_cause?: string | null
          dob?: string | null
          elem_school?: string | null
          elem_year_graduated?: string | null
          eligibility_acquired?: string | null
          email?: string | null
          emergency_address?: string | null
          emergency_contact?: string | null
          emergency_name?: string | null
          emergency_number?: string | null
          emergency_relationship?: string | null
          employer_address?: string | null
          employer_name?: string | null
          extracurricular_activities?: string | null
          facebook_url?: string | null
          father_address?: string | null
          father_contact?: string | null
          father_given_name?: string | null
          father_last_name?: string | null
          father_middle_name?: string | null
          father_name?: string | null
          father_occupation?: string | null
          father_status?: string | null
          first_name: string
          four_ps_document_url?: string | null
          gender_identity?: string | null
          guardian_address?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          guardian_relation?: string | null
          has_been_convicted_of_crime?: boolean | null
          has_been_criminally_charged?: boolean | null
          has_seen_tour?: boolean | null
          holds_public_service_position?: boolean | null
          honors_awards?: string | null
          id?: number
          indigenous_group?: string | null
          indigenous_group_other?: string | null
          ip_document_url?: string | null
          is_archived?: boolean
          is_child_of_solo_parent?: boolean | null
          is_four_ps_member?: boolean | null
          is_homeless_citizen?: boolean | null
          is_indigenous?: boolean | null
          is_orphan?: boolean | null
          is_pwd?: boolean | null
          is_rebel_returnee?: boolean | null
          is_safe_in_community?: boolean | null
          is_senior_citizen?: boolean | null
          is_solo_parent?: boolean | null
          is_working_student?: boolean | null
          junior_high_school?: string | null
          junior_high_year_graduated?: string | null
          last_name: string
          middle_name?: string | null
          mobile?: string | null
          mother_address?: string | null
          mother_contact?: string | null
          mother_given_name?: string | null
          mother_last_name?: string | null
          mother_middle_name?: string | null
          mother_name?: string | null
          mother_occupation?: string | null
          mother_status?: string | null
          nationality?: string | null
          num_brothers?: string | null
          num_children?: string | null
          num_sisters?: string | null
          organizations_memberships?: string | null
          orphan_cause?: string | null
          orphan_cause_other?: string | null
          other_talents?: string | null
          parent_address?: string | null
          parents_num_children?: string | null
          place_of_birth?: string | null
          priority_course?: string | null
          profile_completed?: boolean | null
          profile_picture_url?: string | null
          province?: string | null
          public_service_position?: string | null
          pwd_document_url?: string | null
          pwd_number?: string | null
          pwd_type?: string | null
          pwd_type_other?: string | null
          region?: string | null
          region_other?: string | null
          religion?: string | null
          scholarships_availed?: string | null
          school_last_attended?: string | null
          section?: string | null
          senior_citizen_document_url?: string | null
          senior_high_school?: string | null
          senior_high_year_graduated?: string | null
          sex?: string | null
          solo_parent_document_url?: string | null
          special_trainings_attended?: string | null
          sports_skills?: string | null
          spouse_contact?: string | null
          spouse_employer_address?: string | null
          spouse_employer_name?: string | null
          spouse_name?: string | null
          spouse_occupation?: string | null
          status?: string | null
          street?: string | null
          student_id: string
          suffix?: string | null
          supporter?: string | null
          supporter_contact?: string | null
          tesda_nc2_acquired?: string | null
          witnessed_conflict?: boolean | null
          work_experiences?: string | null
          working_student_type?: string | null
          working_student_type_other?: string | null
          year_level?: string | null
          year_level_other?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          alt_course_1?: string | null
          alt_course_2?: string | null
          archive_note?: string | null
          archived_at?: string | null
          archived_by?: number | null
          archived_reason?: string | null
          auth_user_id?: string | null
          birth_order?: string | null
          birth_order_other?: string | null
          children_names_birthdates?: string | null
          city?: string | null
          civil_status?: string | null
          college_school?: string | null
          college_year_graduated?: string | null
          course?: string | null
          course_year_archive?: Json
          course_year_confirmed_at?: string | null
          course_year_profile_edited?: boolean | null
          course_year_update_required?: boolean
          course_year_window_end?: string | null
          course_year_window_start?: string | null
          created_at?: string
          crime_conviction_details?: string | null
          criminal_charge_details?: string | null
          currently_pregnant?: string | null
          department?: string | null
          disability_cause?: string | null
          dob?: string | null
          elem_school?: string | null
          elem_year_graduated?: string | null
          eligibility_acquired?: string | null
          email?: string | null
          emergency_address?: string | null
          emergency_contact?: string | null
          emergency_name?: string | null
          emergency_number?: string | null
          emergency_relationship?: string | null
          employer_address?: string | null
          employer_name?: string | null
          extracurricular_activities?: string | null
          facebook_url?: string | null
          father_address?: string | null
          father_contact?: string | null
          father_given_name?: string | null
          father_last_name?: string | null
          father_middle_name?: string | null
          father_name?: string | null
          father_occupation?: string | null
          father_status?: string | null
          first_name?: string
          four_ps_document_url?: string | null
          gender_identity?: string | null
          guardian_address?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          guardian_relation?: string | null
          has_been_convicted_of_crime?: boolean | null
          has_been_criminally_charged?: boolean | null
          has_seen_tour?: boolean | null
          holds_public_service_position?: boolean | null
          honors_awards?: string | null
          id?: number
          indigenous_group?: string | null
          indigenous_group_other?: string | null
          ip_document_url?: string | null
          is_archived?: boolean
          is_child_of_solo_parent?: boolean | null
          is_four_ps_member?: boolean | null
          is_homeless_citizen?: boolean | null
          is_indigenous?: boolean | null
          is_orphan?: boolean | null
          is_pwd?: boolean | null
          is_rebel_returnee?: boolean | null
          is_safe_in_community?: boolean | null
          is_senior_citizen?: boolean | null
          is_solo_parent?: boolean | null
          is_working_student?: boolean | null
          junior_high_school?: string | null
          junior_high_year_graduated?: string | null
          last_name?: string
          middle_name?: string | null
          mobile?: string | null
          mother_address?: string | null
          mother_contact?: string | null
          mother_given_name?: string | null
          mother_last_name?: string | null
          mother_middle_name?: string | null
          mother_name?: string | null
          mother_occupation?: string | null
          mother_status?: string | null
          nationality?: string | null
          num_brothers?: string | null
          num_children?: string | null
          num_sisters?: string | null
          organizations_memberships?: string | null
          orphan_cause?: string | null
          orphan_cause_other?: string | null
          other_talents?: string | null
          parent_address?: string | null
          parents_num_children?: string | null
          place_of_birth?: string | null
          priority_course?: string | null
          profile_completed?: boolean | null
          profile_picture_url?: string | null
          province?: string | null
          public_service_position?: string | null
          pwd_document_url?: string | null
          pwd_number?: string | null
          pwd_type?: string | null
          pwd_type_other?: string | null
          region?: string | null
          region_other?: string | null
          religion?: string | null
          scholarships_availed?: string | null
          school_last_attended?: string | null
          section?: string | null
          senior_citizen_document_url?: string | null
          senior_high_school?: string | null
          senior_high_year_graduated?: string | null
          sex?: string | null
          solo_parent_document_url?: string | null
          special_trainings_attended?: string | null
          sports_skills?: string | null
          spouse_contact?: string | null
          spouse_employer_address?: string | null
          spouse_employer_name?: string | null
          spouse_name?: string | null
          spouse_occupation?: string | null
          status?: string | null
          street?: string | null
          student_id?: string
          suffix?: string | null
          supporter?: string | null
          supporter_contact?: string | null
          tesda_nc2_acquired?: string | null
          witnessed_conflict?: boolean | null
          work_experiences?: string | null
          working_student_type?: string | null
          working_student_type_other?: string | null
          year_level?: string | null
          year_level_other?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_course_fkey"
            columns: ["course"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "students_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "enrolled_students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      peer_facilitator_applications: {
        Row: {
          id: string
          student_id: string
          organizations: string | null
          motivation: string | null
          skills: string | null
          commitment: string | null
          status: string
          school_year: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          organizations?: string | null
          motivation?: string | null
          skills?: string | null
          commitment?: string | null
          status?: string
          school_year?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          organizations?: string | null
          motivation?: string | null
          skills?: string | null
          commitment?: string | null
          status?: string
          school_year?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_facilitator_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          }
        ]
      }
      peer_facilitator_settings: {
        Row: {
          id: number
          school_year: string
          updated_at: string
        }
        Insert: {
          id?: number
          school_year?: string
          updated_at?: string
        }
        Update: {
          id?: number
          school_year?: string
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          form_id: number | null
          id: number
          student_id: string | null
          submitted_at: string | null
        }
        Insert: {
          form_id?: number | null
          id?: number
          student_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          form_id?: number | null
          id?: number
          student_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_submissions_students"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          care_documents_url: string | null
          care_notes: string | null
          created_at: string
          department: string | null
          dept_notes: string | null
          description: string | null
          documents_url: string | null
          id: number
          resolution_notes: string | null
          status: string | null
          student_id: string
          student_name: string | null
          support_type: string | null
        }
        Insert: {
          care_documents_url?: string | null
          care_notes?: string | null
          created_at?: string
          department?: string | null
          dept_notes?: string | null
          description?: string | null
          documents_url?: string | null
          id?: number
          resolution_notes?: string | null
          status?: string | null
          student_id: string
          student_name?: string | null
          support_type?: string | null
        }
        Update: {
          care_documents_url?: string | null
          care_notes?: string | null
          created_at?: string
          department?: string | null
          dept_notes?: string | null
          description?: string | null
          documents_url?: string | null
          id?: number
          resolution_notes?: string | null
          status?: string | null
          student_id?: string
          student_name?: string | null
          support_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "support_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_and_reset_expired_course_year: {
        Args: { p_now?: string }
        Returns: number
      }
      archive_student: {
        Args: {
          p_archived_by?: number
          p_note?: string
          p_reason?: string
          p_student_id: string
        }
        Returns: {
          address: string | null
          age: number | null
          alt_course_1: string | null
          alt_course_2: string | null
          archive_note: string | null
          archived_at: string | null
          archived_by: number | null
          archived_reason: string | null
          auth_user_id: string | null
          birth_order: string | null
          birth_order_other: string | null
          children_names_birthdates: string | null
          city: string | null
          civil_status: string | null
          college_school: string | null
          college_year_graduated: string | null
          course: string | null
          course_year_archive: Json
          course_year_confirmed_at: string | null
          course_year_profile_edited: boolean | null
          course_year_update_required: boolean
          course_year_window_end: string | null
          course_year_window_start: string | null
          created_at: string
          crime_conviction_details: string | null
          criminal_charge_details: string | null
          currently_pregnant: string | null
          department: string | null
          disability_cause: string | null
          dob: string | null
          elem_school: string | null
          elem_year_graduated: string | null
          eligibility_acquired: string | null
          email: string | null
          emergency_address: string | null
          emergency_contact: string | null
          emergency_name: string | null
          emergency_number: string | null
          emergency_relationship: string | null
          employer_address: string | null
          employer_name: string | null
          extracurricular_activities: string | null
          facebook_url: string | null
          father_address: string | null
          father_contact: string | null
          father_given_name: string | null
          father_last_name: string | null
          father_middle_name: string | null
          father_name: string | null
          father_occupation: string | null
          father_status: string | null
          first_name: string
          four_ps_document_url: string | null
          gender_identity: string | null
          guardian_address: string | null
          guardian_contact: string | null
          guardian_name: string | null
          guardian_relation: string | null
          has_been_convicted_of_crime: boolean | null
          has_been_criminally_charged: boolean | null
          has_seen_tour: boolean | null
          holds_public_service_position: boolean | null
          honors_awards: string | null
          id: number
          indigenous_group: string | null
          indigenous_group_other: string | null
          ip_document_url: string | null
          is_archived: boolean
          is_child_of_solo_parent: boolean | null
          is_four_ps_member: boolean | null
          is_homeless_citizen: boolean | null
          is_indigenous: boolean | null
          is_orphan: boolean | null
          is_pwd: boolean | null
          is_rebel_returnee: boolean | null
          is_safe_in_community: boolean | null
          is_senior_citizen: boolean | null
          is_solo_parent: boolean | null
          is_working_student: boolean | null
          junior_high_school: string | null
          junior_high_year_graduated: string | null
          last_name: string
          middle_name: string | null
          mobile: string | null
          mother_address: string | null
          mother_contact: string | null
          mother_given_name: string | null
          mother_last_name: string | null
          mother_middle_name: string | null
          mother_name: string | null
          mother_occupation: string | null
          mother_status: string | null
          nationality: string | null
          num_brothers: string | null
          num_children: string | null
          num_sisters: string | null
          organizations_memberships: string | null
          orphan_cause: string | null
          orphan_cause_other: string | null
          other_talents: string | null
          parent_address: string | null
          parents_num_children: string | null
          place_of_birth: string | null
          priority_course: string | null
          profile_completed: boolean | null
          profile_picture_url: string | null
          province: string | null
          public_service_position: string | null
          pwd_document_url: string | null
          pwd_number: string | null
          pwd_type: string | null
          pwd_type_other: string | null
          region: string | null
          region_other: string | null
          religion: string | null
          scholarships_availed: string | null
          school_last_attended: string | null
          section: string | null
          senior_citizen_document_url: string | null
          senior_high_school: string | null
          senior_high_year_graduated: string | null
          sex: string | null
          solo_parent_document_url: string | null
          special_trainings_attended: string | null
          sports_skills: string | null
          spouse_contact: string | null
          spouse_employer_address: string | null
          spouse_employer_name: string | null
          spouse_name: string | null
          spouse_occupation: string | null
          status: string | null
          street: string | null
          student_id: string
          suffix: string | null
          supporter: string | null
          supporter_contact: string | null
          tesda_nc2_acquired: string | null
          witnessed_conflict: boolean | null
          work_experiences: string | null
          working_student_type: string | null
          working_student_type_other: string | null
          year_level: string | null
          year_level_other: string | null
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "students"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_student_event_registration: {
        Args: { p_event_id: number }
        Returns: {
          cancelled_at: string | null
          course: string | null
          department: string | null
          email: string | null
          event_id: number
          id: number
          registered_at: string
          section: string | null
          status: string
          student_id: string
          student_name: string | null
          updated_at: string
          year_level: string | null
        }
        SetofOptions: {
          from: "*"
          to: "event_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_school_year_label: {
        Args: { end_ts: string; start_ts: string }
        Returns: string
      }
      consume_edge_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          request_count: number
          reset_at: string
          retry_after_seconds: number
        }[]
      }
      current_staff_account_id: { Args: never; Returns: string }
      current_staff_audit_entity_label: {
        Args: { row_data: Json }
        Returns: string
      }
      current_staff_audit_record_id: {
        Args: { row_data: Json }
        Returns: string
      }
      current_staff_department: { Args: never; Returns: string }
      current_staff_email: { Args: never; Returns: string }
      current_staff_full_name: { Args: never; Returns: string }
      current_staff_role: { Args: never; Returns: string }
      current_staff_username: { Args: never; Returns: string }
      current_student_id: { Args: never; Returns: string }
      finalize_application: {
        Args: {
          p_activated_course?: string
          p_activated_student_id?: string
          p_application_id: string
          p_archived_by?: number
          p_outcome: string
        }
        Returns: {
          activated_course: string | null
          activated_student_id: string | null
          age: number | null
          alt_course_1: string | null
          alt_course_2: string | null
          archive_id: number
          archive_outcome: string
          archived_at: string
          archived_by: number | null
          city: string | null
          civil_status: string | null
          created_at: string
          current_choice: number | null
          dob: string | null
          email: string
          facebook_url: string | null
          first_name: string
          gender_identity: string | null
          interview_date: string | null
          interview_panel: string | null
          interview_queue_status: string | null
          interview_venue: string | null
          last_name: string
          middle_name: string | null
          mobile: string
          nat_password_hash: string | null
          nationality: string | null
          place_of_birth: string | null
          priority_course: string
          province: string | null
          reason: string | null
          reference_id: string
          sex: string | null
          source_application_id: string
          source_status: string | null
          status: string
          street: string | null
          suffix: string | null
          test_date: string | null
          test_time: string | null
          time_in: string | null
          time_out: string | null
          username: string | null
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "application_archives"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_care_student_course_year_counts: {
        Args: never
        Returns: {
          course: string
          student_count: number
          year_level: string
        }[]
      }
      get_care_student_population_overview: {
        Args: never
        Returns: {
          active_students: number
          archived_students: number
          school_years: string[]
          total_population: number
        }[]
      }
      get_department_admission_candidates: {
        Args: {
          p_department_name: string
          p_limit?: number
          p_offset?: number
          p_statuses?: string[]
        }
        Returns: {
          active_course: string
          alt_course_1: string
          alt_course_2: string
          created_at: string
          current_choice: number
          email: string
          first_name: string
          id: string
          interview_date: string
          last_name: string
          mobile: string
          priority_course: string
          reference_id: string
          status: string
        }[]
      }
      get_department_applications_page: {
        Args: {
          p_course?: string
          p_department_name: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_ascending?: boolean
          p_statuses?: string[]
        }
        Returns: {
          alt_course_1: string
          alt_course_2: string
          created_at: string
          current_choice: number
          email: string
          first_name: string
          id: string
          interview_date: string
          last_name: string
          mobile: string
          priority_course: string
          reference_id: string
          status: string
          total_count: number
        }[]
      }
      increment_event_attendees: { Args: { e_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      register_student_for_event: {
        Args: { p_event_id: number }
        Returns: {
          cancelled_at: string | null
          course: string | null
          department: string | null
          email: string | null
          event_id: number
          id: number
          registered_at: string
          section: string | null
          status: string
          student_id: string
          student_name: string | null
          updated_at: string
          year_level: string | null
        }
        SetofOptions: {
          from: "*"
          to: "event_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reset_role_permissions_to_defaults: {
        Args: { target_role: string }
        Returns: number
      }
      restore_student: {
        Args: { p_student_id: string }
        Returns: {
          address: string | null
          age: number | null
          alt_course_1: string | null
          alt_course_2: string | null
          archive_note: string | null
          archived_at: string | null
          archived_by: number | null
          archived_reason: string | null
          auth_user_id: string | null
          birth_order: string | null
          birth_order_other: string | null
          children_names_birthdates: string | null
          city: string | null
          civil_status: string | null
          college_school: string | null
          college_year_graduated: string | null
          course: string | null
          course_year_archive: Json
          course_year_confirmed_at: string | null
          course_year_profile_edited: boolean | null
          course_year_update_required: boolean
          course_year_window_end: string | null
          course_year_window_start: string | null
          created_at: string
          crime_conviction_details: string | null
          criminal_charge_details: string | null
          currently_pregnant: string | null
          department: string | null
          disability_cause: string | null
          dob: string | null
          elem_school: string | null
          elem_year_graduated: string | null
          eligibility_acquired: string | null
          email: string | null
          emergency_address: string | null
          emergency_contact: string | null
          emergency_name: string | null
          emergency_number: string | null
          emergency_relationship: string | null
          employer_address: string | null
          employer_name: string | null
          extracurricular_activities: string | null
          facebook_url: string | null
          father_address: string | null
          father_contact: string | null
          father_given_name: string | null
          father_last_name: string | null
          father_middle_name: string | null
          father_name: string | null
          father_occupation: string | null
          father_status: string | null
          first_name: string
          four_ps_document_url: string | null
          gender_identity: string | null
          guardian_address: string | null
          guardian_contact: string | null
          guardian_name: string | null
          guardian_relation: string | null
          has_been_convicted_of_crime: boolean | null
          has_been_criminally_charged: boolean | null
          has_seen_tour: boolean | null
          holds_public_service_position: boolean | null
          honors_awards: string | null
          id: number
          indigenous_group: string | null
          indigenous_group_other: string | null
          ip_document_url: string | null
          is_archived: boolean
          is_child_of_solo_parent: boolean | null
          is_four_ps_member: boolean | null
          is_homeless_citizen: boolean | null
          is_indigenous: boolean | null
          is_orphan: boolean | null
          is_pwd: boolean | null
          is_rebel_returnee: boolean | null
          is_safe_in_community: boolean | null
          is_senior_citizen: boolean | null
          is_solo_parent: boolean | null
          is_working_student: boolean | null
          junior_high_school: string | null
          junior_high_year_graduated: string | null
          last_name: string
          middle_name: string | null
          mobile: string | null
          mother_address: string | null
          mother_contact: string | null
          mother_given_name: string | null
          mother_last_name: string | null
          mother_middle_name: string | null
          mother_name: string | null
          mother_occupation: string | null
          mother_status: string | null
          nationality: string | null
          num_brothers: string | null
          num_children: string | null
          num_sisters: string | null
          organizations_memberships: string | null
          orphan_cause: string | null
          orphan_cause_other: string | null
          other_talents: string | null
          parent_address: string | null
          parents_num_children: string | null
          place_of_birth: string | null
          priority_course: string | null
          profile_completed: boolean | null
          profile_picture_url: string | null
          province: string | null
          public_service_position: string | null
          pwd_document_url: string | null
          pwd_number: string | null
          pwd_type: string | null
          pwd_type_other: string | null
          region: string | null
          region_other: string | null
          religion: string | null
          scholarships_availed: string | null
          school_last_attended: string | null
          section: string | null
          senior_citizen_document_url: string | null
          senior_high_school: string | null
          senior_high_year_graduated: string | null
          sex: string | null
          solo_parent_document_url: string | null
          special_trainings_attended: string | null
          sports_skills: string | null
          spouse_contact: string | null
          spouse_employer_address: string | null
          spouse_employer_name: string | null
          spouse_name: string | null
          spouse_occupation: string | null
          status: string | null
          street: string | null
          student_id: string
          suffix: string | null
          supporter: string | null
          supporter_contact: string | null
          tesda_nc2_acquired: string | null
          witnessed_conflict: boolean | null
          work_experiences: string | null
          working_student_type: string | null
          working_student_type_other: string | null
          year_level: string | null
          year_level_other: string | null
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "students"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_care_students: {
        Args: {
          p_course?: string
          p_department?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_section?: string
          p_sort_ascending?: boolean
          p_sort_column?: string
          p_status?: string
          p_year_level?: string
        }
        Returns: {
          archive_note: string
          archived_at: string
          archived_by: string
          archived_reason: string
          course: string
          course_year_archive: Json
          course_year_confirmed_at: string
          course_year_update_required: boolean
          course_year_window_end: string
          course_year_window_start: string
          created_at: string
          department: string
          first_name: string
          id: number
          is_archived: boolean
          last_name: string
          profile_completed: boolean
          section: string
          status: string
          student_id: string
          total_count: number
          year_level: string
        }[]
      }
      seed_archive_action_permission_defaults: {
        Args: { target_role?: string }
        Returns: number
      }
      seed_default_role_permissions: {
        Args: { target_role?: string }
        Returns: number
      }
      seed_student_role_permissions: { Args: never; Returns: number }
      swap_or_rename_student_ids: {
        Args: { p_source_id: string; p_target_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

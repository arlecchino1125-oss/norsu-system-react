// Profile category definitions — exact sdaf.txt labels & order
// Fields with `db` read directly; fields with `compute` derive the value from the student object
export const PROFILE_CATEGORIES = [
    {
        key: 'personal', label: 'Personal Information', icon: '\u{1F464}', gradient: 'from-blue-500 to-sky-400', fields: [
            { label: 'Photo/Portrait', db: 'profile_picture_url', type: 'profilePhoto' },
            { label: 'Student ID No.', db: 'student_id' },
            { label: 'Last Name', db: 'last_name' },
            { label: 'Given Name', db: 'first_name' },
            { label: 'Extension Name', db: 'suffix' },
            { label: 'Middle Name', db: 'middle_name' },
            { label: 'Permanent Address - Street/Sitio & Barangay', db: 'street' },
            { label: 'Permanent Address - Town/City Municipality', db: 'city' },
            { label: 'Permanent Address - Province', db: 'province' },
            { label: 'Permanent Address - Zip Code', db: 'zip_code' },
            { label: 'Permanent Address - Region', db: 'region' },
            { label: 'Contact Number', db: 'mobile' },
            { label: 'Age', db: 'age' },
            { label: 'Birthday', db: 'dob' },
            { label: 'Sex Assigned at Birth', db: 'sex' },
            { label: 'Gender', db: 'gender_identity' },
            { label: 'Citizenship', db: 'nationality' },
            { label: 'Facebook Account Link', db: 'facebook_url' },
            { label: 'Place of Birth', db: 'place_of_birth' },
            { label: 'Religion', db: 'religion' },
            { label: 'Year Level', db: 'year_level' },
            { label: 'College', db: 'department' },
            { label: 'Program', db: 'course' },
            { label: 'Civil Status', db: 'civil_status' },
        ]
    },
    {
        key: 'family', label: 'Family Background', icon: '👨‍👩‍👧', gradient: 'from-amber-400 to-orange-500', fields: [
            { label: 'Name of Spouse', db: 'spouse_name' },
            { label: "Spouse's Occupation", db: 'spouse_occupation' },
            { label: "Spouse's Employer/Business Name", db: 'spouse_employer_name' },
            { label: "Spouse's Employer/Business Address", db: 'spouse_employer_address' },
            { label: "Spouse's Contact Number", db: 'spouse_contact' },
            { label: 'Number of Children', db: 'num_children' },
            { label: 'Name of Children - Date of Birth', db: 'children_names_birthdates' },
            { label: 'Currently Pregnant', db: 'currently_pregnant' },
            { label: "Mother's Maiden Last Name", db: 'mother_last_name' },
            { label: "Mother's Given Name", db: 'mother_given_name' },
            { label: "Mother's Maiden Middle Name", db: 'mother_middle_name' },
            { label: "Mother's Occupation", db: 'mother_occupation' },
            { label: "Mother's Status", db: 'mother_status' },
            { label: "Mother's Contact Number", db: 'mother_contact' },
            { label: "Mother's Address", db: 'mother_address' },
            { label: "Father's Last Name", db: 'father_last_name' },
            { label: "Father's Given Name", db: 'father_given_name' },
            { label: "Father's Middle Name", db: 'father_middle_name' },
            { label: "Father's Occupation", db: 'father_occupation' },
            { label: "Father's Status", db: 'father_status' },
            { label: "Father's Contact Number", db: 'father_contact' },
            { label: "Father's Address", db: 'father_address' },
            { label: 'Number of Children Your Parents Have', db: 'parents_num_children' },
            { label: 'Your Birth Order in the Family', db: 'birth_order' },
        ]
    },
    {
        key: 'socioEconomic', label: 'Socio-Economic Background', icon: 'ℹ️', gradient: 'from-indigo-400 to-violet-500', fields: [
            { label: 'Person/Agency Who Supports Your Studies Financially Other Than Yourself', db: 'supporter' },
            { label: 'Contact Information of the Person/Agency Who Supports Your Studies Financially Other Than Yourself', db: 'supporter_contact' },
            { label: 'Are You a Working Student', db: 'is_working_student', type: 'boolean' },
            { label: 'Type of Work', db: 'working_student_type' },
            { label: 'Name of Employer', db: 'employer_name' },
            { label: 'Address of Employer', db: 'employer_address' },
            { label: 'Are You a Person With Disability (PWD)', db: 'is_pwd', type: 'boolean' },
            { label: 'PWD Number', db: 'pwd_number' },
            { label: 'Type of Disability', db: 'pwd_type' },
            { label: 'Cause of Disability', db: 'disability_cause' },
            { label: 'PWD Document', db: 'pwd_document_url', type: 'document' },
            { label: 'Are You a Member of Any Indigenous Group & Cultural Communities', db: 'is_indigenous', type: 'boolean' },
            { label: 'Indigenous Group', db: 'indigenous_group' },
            { label: 'Indigenous Group Document', db: 'ip_document_url', type: 'document' },
            { label: 'Are You a Member of 4Ps', db: 'is_four_ps_member', type: 'boolean' },
            { label: '4Ps Document', db: 'four_ps_document_url', type: 'document' },
            { label: 'Are You a Rebel Returnee', db: 'is_rebel_returnee', type: 'boolean' },
            { label: 'Are You a Son/Daughter of a Solo Parent', db: 'is_child_of_solo_parent', type: 'boolean' },
            { label: 'Are You a Solo Parent Yourself', db: 'is_solo_parent', type: 'boolean' },
            { label: 'Solo Parent Document', db: 'solo_parent_document_url', type: 'document' },
            { label: 'Are You an Orphan', db: 'is_orphan', type: 'boolean' },
            { label: 'Cause of Being an Orphan', db: 'orphan_cause' },
            { label: 'Are You a Homeless Citizen', db: 'is_homeless_citizen', type: 'boolean' },
            { label: 'Are You a Senior Citizen', db: 'is_senior_citizen', type: 'boolean' },
            { label: 'Senior Citizen Document', db: 'senior_citizen_document_url', type: 'document' },
            { label: 'Work Experiences', db: 'work_experiences' },
        ]
    },
    {
        key: 'guardian', label: 'Guardian', icon: '🛡️', gradient: 'from-slate-500 to-slate-700', fields: [
            { label: 'Guardian Full Name', db: 'guardian_name' },
            { label: 'Guardian Address', db: 'guardian_address' },
            { label: 'Guardian Contact Number', db: 'guardian_contact' },
            { label: 'Relation to the Guardian', db: 'guardian_relation' },
        ]
    },
    {
        key: 'emergency', label: 'Person to Contact (In Case of Emergency)', icon: '🚨', gradient: 'from-rose-400 to-red-500', fields: [
            { label: 'Emergency Contact Full Name', db: 'emergency_name' },
            { label: 'Emergency Contact Address', db: 'emergency_address' },
            { label: 'Emergency Contact Relationship', db: 'emergency_relationship' },
            { label: 'Emergency Contact Number', db: 'emergency_number' },
        ]
    },
    {
        key: 'education', label: 'Educational Background', icon: '🎓', gradient: 'from-cyan-400 to-blue-500', fields: [
            { label: 'Elementary School', db: 'elem_school' },
            { label: 'Elementary Inclusive Years Attended', db: 'elem_year_graduated' },
            { label: 'Junior High School', db: 'junior_high_school' },
            { label: 'Junior High Inclusive Years Attended', db: 'junior_high_year_graduated' },
            { label: 'Senior High School', db: 'senior_high_school' },
            { label: 'Senior High Inclusive Years Attended', db: 'senior_high_year_graduated' },
            { label: 'Transferee College', db: 'college_school' },
            { label: 'Transferee College Inclusive Years Attended', db: 'college_year_graduated' },
            { label: 'Honor/Award Received', db: 'honors_awards' },
            { label: 'TESDA NC II Acquired - Date Acquired - Validity', db: 'tesda_nc2_acquired' },
            { label: 'Eligibility Acquired - Date Acquired', db: 'eligibility_acquired' },
            { label: 'Special Trainings Attended', db: 'special_trainings_attended' },
        ]
    },
    {
        key: 'extracurricular', label: 'Extra-Curricular Involvement', icon: '⚽', gradient: 'from-pink-400 to-rose-500', fields: [
            { label: 'Name of Voluntary Activities', db: 'extracurricular_activities' },
            { label: 'Do You Hold a Local/National Position in Public Service', db: 'holds_public_service_position', type: 'boolean' },
            { label: 'Position in Public Service', db: 'public_service_position' },
            { label: 'Organizations You Are a Member Of', db: 'organizations_memberships' },
            { label: 'Sports You Are Good At', db: 'sports_skills' },
            { label: 'Other Talent/s', db: 'other_talents' },
        ]
    },
    {
        key: 'scholarships', label: 'Scholarships', icon: '🏆', gradient: 'from-yellow-400 to-amber-500', fields: [
            { label: 'Name of Scholarship Availed & Sponsor', db: 'scholarships_availed' },
            { label: 'Have You Been Criminally Charged Before Any Court', db: 'has_been_criminally_charged', type: 'boolean' },
            { label: 'Have You Been Convicted of Any Crime', db: 'has_been_convicted_of_crime', type: 'boolean' },
        ]
    },
    {
        key: 'additional', label: 'Additional Information', icon: 'ℹ️', gradient: 'from-slate-500 to-slate-700', fields: [
        ]
    },
].filter(category => category.fields.length > 0);

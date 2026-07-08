export const STUDENT_ACTIVATION_SETTINGS_ROW_ID = 1;
export const DEFAULT_REQUIRE_ENROLLMENT_KEY = true;

export type StudentActivationPolicy = {
  requireEnrollmentKey: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

const normalizeRequireEnrollmentKey = (value: unknown) =>
  value === false ? false : DEFAULT_REQUIRE_ENROLLMENT_KEY;

export const getStudentActivationPolicy = async (
  adminClient: any,
): Promise<StudentActivationPolicy> => {
  const { data: existingData, error } = await adminClient
    .from("student_activation_settings")
    .select("require_enrollment_key, updated_at, updated_by")
    .eq("id", STUDENT_ACTIVATION_SETTINGS_ROW_ID)
    .maybeSingle();
  let data = existingData;

  if (error) throw error;

  if (!data) {
    const { data: createdData, error: createError } = await adminClient
      .from("student_activation_settings")
      .upsert(
        {
          id: STUDENT_ACTIVATION_SETTINGS_ROW_ID,
          require_enrollment_key: DEFAULT_REQUIRE_ENROLLMENT_KEY,
        },
        { onConflict: "id" },
      )
      .select("require_enrollment_key, updated_at, updated_by")
      .single();

    if (createError) throw createError;
    data = createdData;
  }

  return {
    requireEnrollmentKey: normalizeRequireEnrollmentKey(data?.require_enrollment_key),
    updatedAt: data?.updated_at ? String(data.updated_at) : null,
    updatedBy: data?.updated_by ? String(data.updated_by) : null,
  };
};

export const updateStudentActivationPolicy = async (
  adminClient: any,
  requireEnrollmentKey: boolean,
  updatedBy?: string | null,
): Promise<StudentActivationPolicy> => {
  const { data, error } = await adminClient
    .from("student_activation_settings")
    .upsert(
      {
        id: STUDENT_ACTIVATION_SETTINGS_ROW_ID,
        require_enrollment_key: requireEnrollmentKey,
        updated_by: updatedBy || null,
      },
      { onConflict: "id" },
    )
    .select("require_enrollment_key, updated_at, updated_by")
    .single();

  if (error) throw error;

  return {
    requireEnrollmentKey: normalizeRequireEnrollmentKey(data?.require_enrollment_key),
    updatedAt: data?.updated_at ? String(data.updated_at) : null,
    updatedBy: data?.updated_by ? String(data.updated_by) : null,
  };
};

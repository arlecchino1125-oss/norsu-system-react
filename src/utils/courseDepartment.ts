type CourseRecord = {
    name?: string | null;
    department_id?: string | number | null;
    departments?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type DepartmentRecord = {
    id?: string | number | null;
    name?: string | null;
};

const normalizeValue = (value?: string | number | null) => String(value || '').trim().toLowerCase();

const extractDepartmentName = (departments: CourseRecord['departments']) => {
    if (!departments) return null;
    if (Array.isArray(departments)) {
        return departments[0]?.name || null;
    }
    return departments.name || null;
};

export const getDepartmentNameFromCourseRecords = (
    courseName: string,
    courses: CourseRecord[] = [],
    departments: DepartmentRecord[] = [],
    fallbackDepartment = 'Unassigned'
) => {
    const normalizedCourse = normalizeValue(courseName);
    if (!normalizedCourse) return fallbackDepartment;

    const courseRecord = courses.find((course) => normalizeValue(course.name) === normalizedCourse);
    if (!courseRecord) return fallbackDepartment;

    const joinedDepartment = extractDepartmentName(courseRecord.departments);
    if (joinedDepartment) return joinedDepartment;

    const departmentRecord = departments.find(
        (department) => String(department.id || '') === String(courseRecord.department_id || '')
    );
    return departmentRecord?.name || fallbackDepartment;
};

export const fetchDepartmentNameForCourse = async (
    client: any,
    courseName: string,
    fallbackDepartment = 'Unassigned'
) => {
    const normalizedCourse = normalizeValue(courseName);
    if (!normalizedCourse) return fallbackDepartment;

    const { data, error } = await client
        .from('courses')
        .select('name, department_id, departments(name)')
        .eq('name', courseName)
        .maybeSingle();

    if (error) throw error;

    return getDepartmentNameFromCourseRecords(courseName, data ? [data] : [], [], fallbackDepartment);
};

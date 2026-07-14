import { sanitizePlainText } from './plainText.ts';

type SubmissionBody = Record<string, unknown>;

const withStatus = (message: string) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = 400;
    return error;
};

const requiredText = (
    body: SubmissionBody,
    key: string,
    label: string,
    maxLength: number
) => {
    const value = sanitizePlainText(body[key], { maxLength });
    if (!value) throw withStatus(`${label} is required.`);
    return value;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const validateNatSubmission = (body: SubmissionBody) => {
    if (body.privacy_accepted !== true) {
        throw withStatus('Accept the privacy notice before submitting.');
    }

    const firstName = requiredText(body, 'first_name', 'First name', 80);
    const lastName = requiredText(body, 'last_name', 'Last name', 80);
    const dob = requiredText(body, 'dob', 'Date of birth', 10);
    const placeOfBirth = requiredText(body, 'place_of_birth', 'Place of birth', 120);
    const nationality = requiredText(body, 'nationality', 'Nationality', 80);
    const sex = requiredText(body, 'sex', 'Sex', 20);
    const civilStatus = requiredText(body, 'civil_status', 'Civil status', 40);
    const reason = requiredText(body, 'reason', 'Reason for applying', 500);
    const street = requiredText(body, 'street', 'Street address', 160);
    const city = requiredText(body, 'city', 'City', 80);
    const province = requiredText(body, 'province', 'Province', 80);
    const zipCode = requiredText(body, 'zip_code', 'ZIP code', 20);
    const mobile = requiredText(body, 'mobile', 'Mobile number', 24);
    const email = requiredText(body, 'email', 'Email address', 254).toLowerCase();
    const priorityCourse = requiredText(body, 'priority_course', 'Primary course choice', 120);
    const altCourse1 = requiredText(body, 'alt_course_1', 'Second course choice', 120);
    const altCourse2 = requiredText(body, 'alt_course_2', 'Third course choice', 120);
    const testDate = requiredText(body, 'test_date', 'Test date', 10);
    const age = Number(String(body.age ?? '').trim());

    if (!isIsoDate(dob)) throw withStatus('A valid date of birth is required.');
    if (!Number.isInteger(age) || age <= 0) throw withStatus('A valid age is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw withStatus('A valid email address is required.');
    }

    const mobileDigits = mobile.replace(/\D/g, '');
    if (mobileDigits.length < 10 || mobileDigits.length > 13) {
        throw withStatus('Mobile number must contain 10 to 13 digits.');
    }

    const courseChoices = [priorityCourse, altCourse1, altCourse2]
        .map((course) => course.toLowerCase());
    if (new Set(courseChoices).size !== courseChoices.length) {
        throw withStatus('Choose three different courses.');
    }

    if (!isIsoDate(testDate)) throw withStatus('A valid test date is required.');

    return {
        firstName,
        lastName,
        dob,
        age,
        placeOfBirth,
        nationality,
        sex,
        civilStatus,
        reason,
        street,
        city,
        province,
        zipCode,
        mobile,
        email,
        priorityCourse,
        altCourse1,
        altCourse2,
        testDate
    };
};

import { describe, expect, it } from 'vitest';
import { validateNatSubmission } from './submissionValidation.ts';

const validSubmission = () => ({
    privacy_accepted: true,
    first_name: ' Ada ',
    last_name: ' Lovelace ',
    dob: '2008-01-01',
    age: '18',
    place_of_birth: 'Dumaguete City',
    nationality: 'Filipino',
    sex: 'Female',
    civil_status: 'Single',
    reason: 'I want to study at NORSU.',
    street: 'Rizal Street',
    city: 'Dumaguete City',
    province: 'Negros Oriental',
    zip_code: '6200',
    mobile: '+63 912 345 6789',
    email: ' ADA@EXAMPLE.COM ',
    priority_course: 'BS Information Technology',
    alt_course_1: 'BS Computer Science',
    alt_course_2: 'BS Information Systems',
    test_date: '2026-08-01'
});

describe('NAT submission validation', () => {
    it('normalizes a complete submission', () => {
        expect(validateNatSubmission(validSubmission())).toMatchObject({
            firstName: 'Ada',
            lastName: 'Lovelace',
            dob: '2008-01-01',
            age: 18,
            email: 'ada@example.com',
            priorityCourse: 'BS Information Technology',
            altCourse1: 'BS Computer Science',
            altCourse2: 'BS Information Systems'
        });
    });

    it.each([
        'first_name',
        'last_name',
        'dob',
        'place_of_birth',
        'nationality',
        'sex',
        'civil_status',
        'reason',
        'street',
        'city',
        'province',
        'zip_code',
        'mobile',
        'email',
        'priority_course',
        'alt_course_1',
        'alt_course_2',
        'test_date'
    ])('rejects a missing required %s field', (field) => {
        expect(() => validateNatSubmission({
            ...validSubmission(),
            [field]: ''
        })).toThrow();
    });

    it('requires explicit privacy acceptance', () => {
        expect(() => validateNatSubmission({
            ...validSubmission(),
            privacy_accepted: false
        })).toThrow('Accept the privacy notice before submitting.');
    });

    it('rejects duplicate course choices', () => {
        expect(() => validateNatSubmission({
            ...validSubmission(),
            alt_course_2: 'BS Information Technology'
        })).toThrow('Choose three different courses.');
    });

    it('rejects invalid age, mobile, email, and test date values', () => {
        for (const override of [
            { age: 0 },
            { mobile: '12345' },
            { email: 'not-an-email' },
            { test_date: '08/01/2026' }
        ]) {
            expect(() => validateNatSubmission({
                ...validSubmission(),
                ...override
            })).toThrow();
        }
    });
});

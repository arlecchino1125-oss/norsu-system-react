import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AccountSecuritySettings from './AccountSecuritySettings';

describe('AccountSecuritySettings', () => {
    it('masks the current email and leaves the new email field empty', () => {
        render(
            <AccountSecuritySettings
                currentEmail="rinykizu@gmail.com"
                loginLabel="your student email"
                emailHelperText="Email helper text"
                passwordHelperText="Password helper text"
                requestOtp={vi.fn().mockResolvedValue({})}
                confirmEmailChange={vi.fn().mockResolvedValue(undefined)}
                confirmPasswordChange={vi.fn().mockResolvedValue(undefined)}
            />
        );

        expect(screen.queryByText('rinykizu@gmail.com')).not.toBeInTheDocument();
        expect(screen.getByText('r******u@g***.com')).toBeInTheDocument();
        expect(screen.getByLabelText('New Email')).toHaveValue('');
    });
});

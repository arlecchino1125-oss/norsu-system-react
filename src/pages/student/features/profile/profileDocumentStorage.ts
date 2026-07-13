import {
    uploadR2Document,
    type R2ClaimCategory
} from '../../../../services/r2DocumentService';

type ProfileUploadCategory = 'profile-photo' | R2ClaimCategory;

const PROFILE_DOCUMENT_CATEGORIES: Record<string, ProfileUploadCategory> = {
    profile_picture_url: 'profile-photo',
    profilePictureUrl: 'profile-photo',
    pwdDocumentUrl: 'claim-pwd',
    ipDocumentUrl: 'claim-indigenous',
    fourPsDocumentUrl: 'claim-four-ps',
    soloParentDocumentUrl: 'claim-solo-parent',
    seniorCitizenDocumentUrl: 'claim-senior-citizen'
};

export const getProfileDocumentCategory = (field: string) => {
    const category = PROFILE_DOCUMENT_CATEGORIES[field];
    if (!category) throw new Error('Unsupported profile document field.');
    return category;
};

export const uploadProfileDocument = async (file: File, field: string) => {
    const category = getProfileDocumentCategory(field);
    const result = await uploadR2Document(file, { category });
    return result.storedReference;
};

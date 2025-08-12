export declare function generateTask(
    questions: string[],
    userResponses: string[],
    charterQuestions: string[],
    teamCharterResponses: string[],
    teamMembers: Array<{
        email: string;
        skills?: string;
        interests?: string;
        careerGoals?: string;
    }>,
    memberCapabilities: Array<{
        member_email: string;
        strengths: string[];
        skills: string[];
        role_suggestion: string;
        compatibility_score: number;
    }>
): Promise<string>;

"use server";
// HAS TO HAVE USE SERVER!!! OTHERWISE NOT WORKING
// because openai blocks openai api key if used on client side to prevent leaking
import { apiRequest } from "./apiRequest.js";

const responseFormat = {
    type: "json_schema",
    json_schema: {
        name: "user_groups",
        schema: {
            type: "object",
            properties: {
                group_size: {
                    type: "number",
                    description: "The size that each group should contain.",
                },
                groups: {
                    type: "array",
                    description: "List of groups created from users.",
                    items: {
                        type: "array",
                        description: "List of user IDs in each group.",
                        items: {
                            type: "string",
                        },
                    },
                },
                compatibility_score: {
                    type: "number",
                    description: "Overall compatibility score for the team (0-100), calculated as weighted average: technical alignment (40%) + interest alignment (35%) + career goal alignment (25%)",
                    minimum: 70,
                    maximum: 100
                },
            },
            required: ["group_size", "groups"],
            additionalProperties: false,
        },
    },
};

export const matching = async (teamSize, questions, input) => {
    const context = `You are an AI-driven team formation engine. Your task is to group users into teams of size ${teamSize} based on their onboarding survey responses. Team formations are based on information from \${platform onboarding} and \${project onboarding} surveys.

    TEAM SCORING MODEL:
    Evaluate each user across three key dimensions using the survey answers. Assign weighted scores to determine optimal groupings:
    
    1. **Technical Alignment (40% weight)**
       - Question: "What is your primary area of expertise and main professional skills?"
       - Group users with complementary technical skills
       - Ensure each team has skill coverage across areas in order to realistically execute the project goals (e.g., frontend, backend, design)
       - Balance specialization and generalization across team members
    
    2. **Interest Alignment (35% weight)**  
       - Question: "What industries or fields are you currently most interested in and have some levels of skills and experiences?"
       - Cluster users with overlapping or similar industry interests and project enthusiasm
       - Include complementary perspectives when aligned with shared motivations
    
    3. **Career Goal Alignment (25% weight)**
       - Question: "What future roles or job titles are you aiming for?"
       - Group users with compatible long-term career objectives
       - Balance leadership aspirations and role synergy across each team
       - Ensure goals support collaborative growth within the team

    TEAMING RULES & CONSTRAINTS (Use these to guide team formation logic):
    Teams must have balanced technical coverage and diverse strengths
    Avoid teammates with identical skill sets or conflicting career paths
    Favor teams with shared motivations and compatible personalities
    Optimize for both immediate project effectiveness and long-term collaboration potential
    Respect the target team size: ${teamSize}

        Given the user onboarding survey responses in the following format and order: ${questions}, analyze each user's responses and group them into teams that will have the highest compatibility and effectiveness.;

    Output Requirement:
    Return teams as a list of grouped user IDs (or names), ranked by compatibility score. Include a brief justification per team showing how they meet the three alignment criteria. Also provide an overall compatibility_score (0-100) calculated as: technical alignment (40%) + interest alignment (35%) + career goal alignment (25%).`;


    
    teamSize = Number(teamSize);
    if (isNaN(teamSize) || teamSize <= 0) {
        throw new Error("Team size must be a valid positive number");
    }
    if (!input || input.length === 0) {
        throw new Error("There are no members to be matched.");
    }
    input = input.join(" ");
    return await apiRequest({ context, responseFormat, input, functionName: "matching" });
};

// 新的匹配函数，考虑现有团队成员
export const matchingWithExistingTeam = async (teamSize, questions, newMembersInput, existingMembersInfo) => {
    const context = `You are an AI-driven team formation engine. Your task is to select ${teamSize} new members to join an existing team, based on their onboarding survey responses and how they complement the existing team members.

    EXISTING TEAM CONTEXT:
    The team already has the following members: ${existingMembersInfo.length > 0 ? existingMembersInfo.join("; ") : "No existing members"}
    
    TEAM SCORING MODEL:
    Evaluate each potential new user across three key dimensions using the survey answers. Assign weighted scores to determine optimal additions that COMPLEMENT the existing team:
    
    1. **Technical Alignment (40% weight)**
       - Question: "What is your primary area of expertise and main professional skills?"
       - Select users whose technical skills COMPLEMENT and FILL GAPS in the existing team's skill set
       - Ensure the combined team (existing + new) has comprehensive skill coverage
       - Avoid redundant skills unless they strengthen critical areas
    
    2. **Interest Alignment (35% weight)**  
       - Question: "What industries or fields are you currently most interested in some levels of skills and experiences?"
       - Choose users whose interests align with or complement the existing team's focus areas
       - Balance shared motivations with diverse perspectives
    
    3. **Career Goal Alignment (25% weight)**
       - Question: "What future roles or job titles are you aiming for?"
       - Select users whose career goals create synergy with existing team members
       - Avoid conflicting leadership aspirations or incompatible role expectations
       - Ensure new members' goals support collaborative growth within the existing team structure

    TEAM ENHANCEMENT RULES:
    - Prioritize skill complementarity over similarity when existing skills are covered
    - Maintain team cohesion by selecting members who will integrate well with existing team dynamics
    - Fill identified skill gaps in the existing team first
    - Ensure new additions enhance rather than disrupt existing team chemistry
    - Consider the existing team's collective strengths and weaknesses
    - Respect the target team size: ${teamSize} NEW members to add

    Given the existing team context above and the potential new members' survey responses in the following format: ${Array.isArray(questions) ? questions.join("\n") : questions}, analyze each candidate and select the ${teamSize} best new members who will most effectively complement and enhance the existing team.

    Output Requirement:
    Return the selected new team members as a single group, ranked by how well they complement the existing team. Include a brief justification showing how they fill gaps and enhance the team's overall capability. Also provide an overall compatibility_score (0-100) representing how well the new members complement the existing team.`;

    teamSize = Number(teamSize);
    if (isNaN(teamSize) || teamSize <= 0) {
        throw new Error("Team size must be a valid positive number");
    }
    if (!newMembersInput || newMembersInput.length === 0) {
        throw new Error("There are no new members to be matched.");
    }
    
    const input = newMembersInput.join(" ");
    return await apiRequest({ context, responseFormat, input, functionName: "matching" });
};

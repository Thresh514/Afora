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
    Return teams as a list of grouped user IDs (or names), ranked by compatibility score. Include a brief justification per team showing how they meet the three alignment criteria.`;


    
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

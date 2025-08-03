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
    const context = `You are an expert team formation specialist. Your task is to group users into teams of size ${teamSize} based on their onboarding survey responses.

    SCORING FRAMEWORK FOR GROUPING DECISIONS:
    When analyzing potential teams, consider these three onboarding questions:
    
    1. **Technical Alignment (40% weight)**
       - Question: "What is your primary area of expertise and main professional skills?"
       - Group users with complementary technical skills
       - Ensure each team has balanced technical coverage (frontend, backend, design, etc.)
       - Avoid teams with all members having identical technical backgrounds
    
    2. **Interest Alignment (35% weight)**  
       - Question: "What industries or fields are you currently most interested in some levels of skills and experiences?"
       - Group users with similar industry interests and motivations
       - Consider both shared interests and complementary perspectives
       - Match users who are excited about similar types of projects
    
    3. **Career Goal Alignment (25% weight)**
       - Question: "What future roles or job titles are you aiming for?"
       - Group users with compatible career goals and team synergy
       - Consider leadership balance and role complementarity
       - Ensure career goals support each other within the team
    
    GROUPING PRINCIPLES:
    - Create balanced teams with complementary skills and backgrounds
    - Ensure diversity within each team while maintaining compatibility
    - Prioritize teams that can work effectively together
    - Consider both immediate project needs and long-term team dynamics
    - Avoid creating teams with significant skill gaps or conflicting interests
    
    Given the user onboarding survey responses in the following format and order: ${questions}, analyze each user's responses and group them into teams that will have the highest compatibility and effectiveness.`;

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

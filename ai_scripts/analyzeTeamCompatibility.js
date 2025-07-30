"use server";
// HAS TO HAVE USE SERVER!!! OTHERWISE NOT WORKING
// because openai blocks openai api key if used on client side to prevent leaking
import { apiRequest } from "./apiRequest.js";

const responseFormat = {
    type: "json_schema",
    json_schema: {
        name: "team_compatibility",
        schema: {
        type: "object",
        properties: {
            score_breakdown: {
                type: "object",
                description: "Weighted breakdown of final score based on Hackathon rubric",
                properties: {
                    technical_alignment: {
                        type: "number",
                        description: "Technical alignment score (40-100)",
                        minimum: 50,
                        maximum: 100
                    },
                    schedule_compatibility: {
                        type: "number",
                        description: "Schedule compatibility score (40-100)",
                        minimum: 50,
                        maximum: 100
                    },
                    interest_alignment: {
                        type: "number",
                        description: "Interest alignment score (40-100)",
                        minimum: 50,
                        maximum: 100
                    },
                    communication_alignment: {
                        type: "number",
                        description: "Communication and collaboration style alignment score (40-100)",
                        minimum: 50,
                        maximum: 100
                    },
                    work_style_compatibility: {
                        type: "number",
                        description: "Work style and methodology compatibility score (40-100)",
                        minimum: 50,
                        maximum: 100
                    },
                    weight_applied: {
                        type: "object",
                        description: "Weight multipliers applied to each dimension",
                        properties: {
                            technical_alignment: {
                                type: "number",
                                description: "Weight for technical alignment (0.35)",
                                minimum: 0,
                                maximum: 1
                            },
                            schedule_compatibility: {
                                type: "number",
                                description: "Weight for schedule compatibility (0.15)",
                                minimum: 0,
                                maximum: 1
                            },
                            interest_alignment: {
                                type: "number",
                                description: "Weight for interest alignment (0.20)",
                                minimum: 0,
                                maximum: 1
                            },
                            communication_alignment: {
                                type: "number",
                                description: "Weight for communication alignment (0.15)",
                                minimum: 0,
                                maximum: 1
                            },
                            work_style_compatibility: {
                                type: "number",
                                description: "Weight for work style compatibility (0.15)",
                                minimum: 0,
                                maximum: 1
                            }
                        },
                        required: [
                            "technical_alignment",
                            "schedule_compatibility",
                            "interest_alignment",
                            "communication_alignment",
                            "work_style_compatibility"
                        ]
                    },
                    calculation_comment: {
                        type: "string",
                        description: "Plain language explanation of how the scores were derived"
                    }
                },
                required: [
                    "technical_alignment",
                    "schedule_compatibility",
                    "interest_alignment",
                    "communication_alignment",
                    "work_style_compatibility",
                    "weight_applied",
                    "calculation_comment"
                ]
            },
            member_analyses: {
                type: "array",
                description: "Individual analysis for each team member",
                items: {
                    type: "object",
                    properties: {
                        member_email: {
                            type: "string",
                            description: "Member's email address",
                        },
                        strengths: {
                            type: "array",
                            description: "Key strengths of this member",
                            items: {
                                type: "string",
                            },
                        },
                        skills: {
                            type: "array",
                            description:
                                "Technical and professional skills",
                            items: {
                                type: "string",
                            },
                        },
                        interests: {
                            type: "array",
                            description: "Areas of interest",
                            items: {
                                type: "string",
                            },
                        },
                        compatibility_score: {
                            type: "number",
                            description:
                                "Individual compatibility score with this specific team and project (not general ability) from 0-100",
                            minimum: 0,
                            maximum: 100,
                        },
                        role_suggestion: {
                            type: "string",
                            description:
                                "Suggested role or position for this member in the team",
                        },
                        detailed_analysis: {
                            type: "object",
                            description: "Detailed analysis of member's capabilities and fit",
                            properties: {
                                technical_proficiency: {
                                    type: "object",
                                    properties: {
                                        score: {
                                            type: "number",
                                            description: "Technical proficiency score from 0-100",
                                            minimum: 0,
                                            maximum: 100
                                        },
                                        strengths: {
                                            type: "array",
                                            items: { type: "string" },
                                            description: "Technical strengths"
                                        },
                                        areas_for_improvement: {
                                            type: "array",
                                            items: { type: "string" },
                                            description: "Areas needing improvement"
                                        }
                                    },
                                    required: ["score", "strengths", "areas_for_improvement"],
                                    additionalProperties: false
                                },
                                collaboration_style: {
                                    type: "object",
                                    properties: {
                                        preferred_methods: {
                                            type: "array",
                                            items: { type: "string" },
                                            description: "Preferred collaboration methods"
                                        },
                                        communication_frequency: {
                                            type: "string",
                                            description: "Preferred communication frequency"
                                        },
                                        team_role: {
                                            type: "string",
                                            description: "Natural team role"
                                        }
                                    },
                                    required: ["preferred_methods", "communication_frequency", "team_role"],
                                    additionalProperties: false
                                },
                                project_contribution: {
                                    type: "object",
                                    properties: {
                                        primary_responsibilities: {
                                            type: "array",
                                            items: { type: "string" },
                                            description: "Primary project responsibilities"
                                        },
                                        potential_impact: {
                                            type: "string",
                                            description: "Potential impact on project"
                                        },
                                        risk_factors: {
                                            type: "array",
                                            items: { type: "string" },
                                            description: "Potential risk factors"
                                        }
                                    },
                                    required: ["primary_responsibilities", "potential_impact", "risk_factors"],
                                    additionalProperties: false
                                }
                            },
                            required: ["technical_proficiency", "collaboration_style", "project_contribution"],
                            additionalProperties: false
                        }
                    },
                    required: [
                        "member_email",
                        "strengths",
                        "skills",
                        "interests",
                        "compatibility_score",
                        "role_suggestion",
                        "detailed_analysis"
                    ],
                    additionalProperties: false,
                },
            },
            team_analysis: {
                type: "object",
                properties: {
                    team_strengths: {
                        type: "array",
                        description: "Overall team strengths",
                        items: {
                            type: "string",
                        },
                    },
                    project_fit: {
                        type: "object",
                        description: "Analysis of how well the team fits the project requirements",
                        properties: {
                            technical_alignment: {
                                type: "number",
                                description: "Score 20-100 indicating how well team's technical skills match project needs",
                                minimum: 20,
                                maximum: 100
                            },
                            schedule_compatibility: {
                                type: "number",
                                description: "Score 20-100 indicating how well team members' schedules align",
                                minimum: 20,
                                maximum: 100
                            },
                            interest_alignment: {
                                type: "number",
                                description: "Score 20-100 indicating how well team's interests align with project goals",
                                minimum: 20,
                                maximum: 100
                            },
                            charter_alignment: {
                                type: "object",
                                description: "Analysis of team charter alignment",
                                properties: {
                                    vision_alignment: {
                                        type: "number",
                                        description: "Score 20-100 indicating how well team members align on project vision",
                                        minimum: 20,
                                        maximum: 100
                                    },
                                    values_compatibility: {
                                        type: "number",
                                        description: "Score 20-100 indicating how well team members' values and working styles align",
                                        minimum: 20,
                                        maximum: 100
                                    },
                                    key_findings: {
                                        type: "array",
                                        description: "Key observations from team charter analysis",
                                        items: {
                                            type: "string"
                                        }
                                    }
                                },
                                required: ["vision_alignment", "values_compatibility", "key_findings"],
                                additionalProperties: false
                            },
                            comments: {
                                type: "object",
                                description: "Structured observations about project-team fit",
                                properties: {
                                    positive_observations: {
                                        type: "array",
                                        description: "Strengths and positive alignments",
                                        items: {
                                            type: "string"
                                        }
                                    },
                                    misalignment_risks: {
                                        type: "array",
                                        description: "Potential conflicts and risks",
                                        items: {
                                            type: "string"
                                        }
                                    }
                                },
                                required: ["positive_observations", "misalignment_risks"]
                            }
                        },
                        required: ["technical_alignment", "schedule_compatibility", "interest_alignment", "charter_alignment", "comments"],
                        additionalProperties: false
                    },
                    potential_gaps: {
                        type: "array",
                        description:
                            "Potential skill or knowledge gaps in the team",
                        items: {
                            type: "string",
                        },
                    },
                    collaboration_potential: {
                        type: "string",
                        description:
                            "Assessment of how well the team might collaborate",
                    },
                    recommendations: {
                        type: "array",
                        description:
                            "Recommendations for improving team effectiveness",
                        items: {
                            type: "string",
                        },
                    },
                },
                required: [
                    "team_strengths",
                    "project_fit",
                    "potential_gaps",
                    "collaboration_potential",
                    "recommendations",
                ],
                additionalProperties: false,
            },
        },
        required: ["score_breakdown", "member_analyses", "team_analysis"],
        additionalProperties: false,
        },
    },
};

export const analyzeTeamCompatibility = async (
    onboardingQuestions,
    memberResponses,
    teamCharterResponse,
    projectOnboardingQuestions = []
) => {
    const context = `
    You are an experienced HR Manager and professional team analyst. Your task is to evaluate team member compatibility and project fit based on onboarding survey responses and team charter input.
    
    Your analysis must be:
    1. **Specific** – avoid vague descriptions; cite exact skills, schedules, interests, or behaviors with concrete examples
    2. **Polarizing** – use contrastive language to highlight strong differences between team members (e.g., "Member A is detail-focused and methodical, whereas Member B is big-picture oriented and improvisational")
    3. **Factually Accurate** – ground your insights only in the data provided, and explicitly state when making assumptions due to missing information
    4. **Optimistic** – focus on strengths, potential, and positive team dynamics while acknowledging areas for improvement
    
    
    TEAM ANALYSIS GOALS:
    Evaluate the team in relation to the project's technical requirements, schedule demands, and success criteria. Break down the synergy and misalignments across members, identifying both strengths and risks.
    
    
    PER MEMBER ANALYSIS (structure strictly required):
    
    **Technical Proficiency**
    - Score (0–100) with specific justification
    - 2–3 core technical strengths with evidence from their responses
    - 1–2 specific technical gaps with project impact (e.g., "Lacks JavaScript experience for a frontend-heavy build, which may delay UI development by 2-3 weeks")
    
    **Collaboration & Communication**
    - Preferred communication tools & meeting frequency with team impact
    - Role tendency (e.g., initiator, mediator, executor) with behavioral evidence
    - Workstyle polarity with specific contrasts (e.g., "Structured planner who creates detailed timelines vs. spontaneous worker who adapts to changing requirements")
    
    **Project Contribution**
    - Clear role & key tasks assigned based on skills with specific task examples
    - Project risk factors with concrete scenarios (e.g., "May miss deadlines under pressure due to perfectionist tendencies")
    - Project value with measurable impact (e.g., "Critical for backend infrastructure setup, estimated to reduce development time by 40%")
    
    **Interest-Skill Alignment**
    - Identify conflicts between stated interests and assigned technical roles
    - Note engagement risks if current assignment doesn't align with long-term goals
    - Suggest role adjustments to better match interests with project needs
    
    
    
    TEAM COMPATIBILITY ASSESSMENT:
    
    Evaluate the **compatibility across these 5 dimensions**:
    
    1. **Technical Alignment**
        - Do the combined skills fully cover the project scope? Identify specific gaps
        - Are there redundant or missing skill areas? Quantify coverage percentage
        - Highlight skill imbalances (e.g., "3 frontend developers but only 1 backend developer")
    
    2. **Schedule Compatibility**
        - If availability data is provided: Calculate overlap percentage and identify bottlenecks
        - If availability is missing: Assume good alignment (80-85 score) with potential for coordination
        - Specific time conflicts (e.g., "Only 1 hour overlap across 3 members on weekdays")
    
    3. **Interest & Motivation Alignment**
        - Are members intrinsically motivated by the project's goal? Use specific quotes from responses
        - Highlight opposite interest types with behavioral implications (e.g., "Research-oriented member may conflict with outcome-driven teammates during rapid prototyping")
        - Identify interest-skill mismatches that could affect engagement
    
    4. **Communication Alignment**
        - Assess alignment in communication preferences (Slack, Email, Video calls)
        - Evaluate frequency preferences (daily, weekly updates)
        - Identify potential communication style conflicts or synergies
    
    5. **Work Style Compatibility**
        - Evaluate methodology preferences (Agile, rigid processes, flexible autonomy)
        - Assess tool preferences and workflow compatibility
        - Identify potential conflicts in working approach and project structure preferences
    
    
    
    SCORE BREAKDOWN REQUIREMENTS:
    - DO NOT calculate or include overall_score in your response.
    - Only return score_breakdown with actual values for:
      * technical_alignment
      * schedule_compatibility
      * interest_alignment
      * communication_alignment
      * work_style_compatibility
    - When data is missing or uncertain, assign 80-85 by default as an optimistic fallback. A score below 60 should only be used when there is explicit evidence of significant incompatibility.
    - Use natural, varied scores (e.g., 82, 87, 79, 84) rather than round numbers ending in 0 or 5.
    - Provide a clear calculation_comment explaining the reasoning behind each dimension score
    - Be generous in scoring - look for positive aspects and potential rather than focusing on gaps
    - Absence of data should default to 80-85, NOT lower scores
    
    SCORING EXAMPLE:
    If technical_alignment=87, interest_alignment=83, communication_alignment=78, work_style_compatibility=82, schedule_compatibility=79:
    score_breakdown should include:
    - technical_alignment: 87
    - schedule_compatibility: 79
    - interest_alignment: 83
    - communication_alignment: 78
    - work_style_compatibility: 82
    - weight_applied with all weights (0.35, 0.15, 0.15, 0.175, 0.175)
    - calculation_comment: "Strong technical coverage with diverse skills; good schedule alignment; high interest in project goals; positive team dynamics."
    
    IMPORTANT: This is just an example. You must use the ACTUAL scores from your analysis, not these example values. Aim for optimistic but realistic scoring. Use any number between 0-9 for the last digit to make scores more natural and varied.
    
    INTERPRETATION:
    - 90–100: Exceptional team, high cohesion and technical fitness
    - 80–89: Strong team, minor misalignments
    - 70–79: Good team, some improvements possible
    - 60–69: Moderate team, minor adjustments needed
    - 40–59: Basic compatibility, significant improvements recommended
    
    SCORING GUIDELINES:
    - Start with optimistic baseline scores (80-85) and adjust based on evidence
    - Focus on potential and strengths rather than limitations
    - Only reduce scores significantly when there is clear evidence of incompatibility
    - Look for complementary skills and positive team dynamics
    - Consider growth potential and learning ability of team members
    - Use natural, varied scores (e.g., 82, 87, 79, 84) to reflect nuanced assessment
    
    
    
    ACTIONABLE IMPROVEMENT RECOMMENDATIONS:
    - Provide specific, role-level adjustments such as reassigning tasks, modifying team roles, or changing responsibility scope to match skills and interests
    - Include concrete behavioral changes (e.g., "Member A should delegate frontend design tasks to Member B due to stronger UI/UX portfolio")
    - Suggest specific communication protocols for identified conflicts
    - Recommend skill development priorities for identified gaps
    - Propose team restructuring if major misalignments exist
    
    
    TEAM SUMMARY:
    Provide a concise, one-paragraph summary that captures the team's key strengths, primary risks, and overall assessment. Use this format: "This team [strength], but [risk]. [Specific recommendation for immediate action]."
    
    
    OUTPUT REQUIREMENTS:
    - Output must match the 'team_compatibility' schema exactly
    - For 'score_breakdown', provide both raw scores and explanation
    - Do not include commentary outside JSON format
    - Use structured format for comments (positive_observations vs misalignment_risks)
    - When making assumptions due to missing data, explicitly state this and its impact on the analysis
    - Write analysis in English with bullet points and short paragraphs for clarity
    - Be concise, sharp, and always evidence-based
    - CRITICAL: Do NOT include overall_score in your response - only provide score_breakdown
    - score_breakdown must reflect the real analysis, not placeholder values
    - Maintain an optimistic perspective while being realistic about challenges
    - Emphasize team potential and growth opportunities
    `;
    

    if (!memberResponses || memberResponses.length === 0) {
        throw new Error("No team member data available for analysis");
    }

    const input = `
        Onboarding Survey Questions:
        ${onboardingQuestions.join("\n")}

        Project Onboarding Questions:
        ${projectOnboardingQuestions && projectOnboardingQuestions.length > 0 ? projectOnboardingQuestions.join("\n") : "Not provided"}

        Team Charter Response:
        ${teamCharterResponse || 'Not provided'}

        Team Member Responses:
        ${memberResponses.map(response => {
            // 提取用户邮箱
            const emailMatch = response.match(/User: (.+)/);
            const email = emailMatch ? emailMatch[1].trim() : 'Unknown';
            
            // 提取onboarding答案
            const onboardingQ1Match = response.match(/Onboarding Question 1 Answer: (.+?)(?=\n|$)/);
            const onboardingQ2Match = response.match(/Onboarding Question 2 Answer: (.+?)(?=\n|$)/);
            const onboardingQ3Match = response.match(/Onboarding Question 3 Answer: (.+?)(?=\n|$)/);
            
            // 提取项目onboarding答案
            const projQ1Match = response.match(/Project Onboarding Question 1 \(Technical Skills\): (.+?)(?=\n|$)/);
            const projQ2Match = response.match(/Project Onboarding Question 2 \(Communication\): (.+?)(?=\n|$)/);
            const projQ3Match = response.match(/Project Onboarding Question 3 \(Project Structure\): (.+?)(?=\n|$)/);
            const projQ4Match = response.match(/Project Onboarding Question 4 \(Team Preferences\): (.+?)(?=\n|$)/);
            const projQ5Match = response.match(/Project Onboarding Question 5 \(Time Availability\): (.+?)(?=\n|$)/);
            
            return `
                    Member: ${email}
                    
                    Onboarding Survey Responses:
                    - Question 1: ${onboardingQ1Match ? onboardingQ1Match[1].trim() : 'No answer'}
                    - Question 2: ${onboardingQ2Match ? onboardingQ2Match[1].trim() : 'No answer'}
                    - Question 3: ${onboardingQ3Match ? onboardingQ3Match[1].trim() : 'No answer'}
                    
                    Project Onboarding Responses:
                    - Technical Skills: ${projQ1Match ? projQ1Match[1].trim() : 'No answer'}
                    - Communication Preferences: ${projQ2Match ? projQ2Match[1].trim() : 'No answer'}
                    - Project Structure Preferences: ${projQ3Match ? projQ3Match[1].trim() : 'No answer'}
                    - Team Preferences: ${projQ4Match ? projQ4Match[1].trim() : 'No answer'}
                    - Time Slots: ${projQ5Match ? projQ5Match[1].trim() : 'No answer'}
                    `
                    }).join("\n\n")}

            Please analyze the compatibility of this team in detail. Your analysis should strictly follow the JSON schema response format and be grounded in the data provided.

            Focus on the following core dimensions, applying a **weighted scoring system** for Hackathon settings (e.g., Technical 35%, Interest 20%, Vision/Values 15% each, Schedule 15%). If data is missing, assume a conservative default (e.g., 60).

            Key analysis areas:
            1. **Technical Alignment** – Assess whether the team's combined technical skills can cover project needs. Highlight missing or redundant skills.
            2. **Schedule Compatibility** – Compare time slot availability and assess real-time collaboration feasibility.
            3. **Interest & Motivation Alignment** – Identify whether members are genuinely interested in the project's goals.
            4. **Charter Alignment** – Evaluate agreement on team vision, work styles, and values, even if the charter is missing.
            5. **Team Dynamics & Role Complementarity** – Evaluate collaboration potential, leadership balance, and communication tendencies.

            At the end of your analysis, provide:
            - A structured **score_breakdown** showing individual dimension scores (DO NOT calculate overall score)
            - Individual member compatibility scores and role suggestions
            - Specific, actionable improvement recommendations`;
    

    try {
        // Log the raw input for debugging
        console.log("=== analyzeTeamCompatibility INPUT ===");
        console.log("Context:", context);
        console.log("Response Format:", JSON.stringify(responseFormat, null, 2));
        console.log("Input:", input);
        console.log("=====================================");

        const result = await apiRequest({ context, responseFormat, input, functionName: "analyzeTeamCompatibility" });
        
        // Log the raw output for debugging
        console.log("=== analyzeTeamCompatibility OUTPUT ===");
        console.log("Raw Result:", result);
        console.log("Result Type:", typeof result);
        console.log("=====================================");
        
        // 确保返回的是有效的 JSON
        if (typeof result === 'string') {
            return result;
        }

        return result;
    } catch (error) {
        console.error("Error in analyzeTeamCompatibility:", error);
        throw error;
    }
};

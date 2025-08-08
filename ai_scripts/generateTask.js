"use server";
// HAS TO HAVE USE SERVER!!! OTHERWISE NOT WORKING
// because openai blocks openai api key if used on client side to prevent leaking
import { apiRequest } from "./apiRequest.js";


const responseFormat = {
    type: "json_schema",
    json_schema: {
        name: "task_generation",
        schema: {
            type: "object",
            properties: {
                stages: {
                    type: "array",
                    description: "A list of stages, each containing a list of tasks.",
                    minItems: 1,
                    items: {
                        type: "object",
                        properties: {
                            stage_name: {
                                type: "string",
                                description: "The name of the stage (avoid using Stage 1, Stage 2, etc.)",
                                minLength: 1
                            },
                            tasks: {
                                type: "array",
                                description: "A list of tasks associated with this stage. Each stage must have at least 5 tasks.",
                                minItems: 5,
                                items: {
                                    type: "object",
                                    properties: {
                                        task_name: {
                                            type: "string",
                                            description: "The name of the task - should be specific and actionable",
                                            minLength: 1
                                        },
                                        task_description: {
                                            type: "string",
                                            description: "Detailed description of what needs to be done",
                                            minLength: 1
                                        },
                                        soft_deadline: {
                                            type: "string",
                                            description: "The first soft deadline for the task in YYYY-MM-DD format",
                                            pattern: "^\\d{4}-\\d{2}-\\d{2}$"
                                        },
                                        hard_deadline: {
                                            type: "string",
                                            description: "The final hard deadline for the task in YYYY-MM-DD format",
                                            pattern: "^\\d{4}-\\d{2}-\\d{2}$"
                                        }
                                    },
                                    required: ["task_name", "task_description", "soft_deadline", "hard_deadline"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["stage_name", "tasks"],
                        additionalProperties: false
                    }
                }
            },
            required: ["stages"],
            additionalProperties: false
        }
    }
};

// Add utility function to sanitize and validate JSON response
const sanitizeAndParseJSON = (jsonString) => {
    try {
        // Remove any potential Unicode control characters
        const cleaned = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        
        // Try to find the actual JSON content (in case AI adds extra text)
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No valid JSON object found in response");
        }
        
        const jsonContent = jsonMatch[0];
        
        // Parse and validate the JSON structure
        const parsed = JSON.parse(jsonContent);
        
        // Validate the required structure
        if (!parsed.stages || !Array.isArray(parsed.stages)) {
            throw new Error("Invalid response format: missing or invalid stages array");
        }
        
        // Validate and sanitize each stage
        parsed.stages = parsed.stages.map((stage, index) => {
            if (!stage.stage_name || typeof stage.stage_name !== 'string') {
                throw new Error(`Stage ${index + 1} has invalid or missing name`);
            }
            
            if (!stage.tasks || !Array.isArray(stage.tasks) || stage.tasks.length < 5) {
                throw new Error(`Stage ${index + 1} (${stage.stage_name}) must have at least 5 tasks`);
            }
            
            // Sanitize and validate each task
            stage.tasks = stage.tasks.map((task, taskIndex) => {
                if (!task.task_name || typeof task.task_name !== 'string') {
                    throw new Error(`Task ${taskIndex + 1} in stage "${stage.stage_name}" has invalid or missing name`);
                }
                
                if (!task.task_description || typeof task.task_description !== 'string') {
                    throw new Error(`Task ${taskIndex + 1} (${task.task_name}) in stage "${stage.stage_name}" has invalid or missing description`);
                }
                
                // Validate date format
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(task.soft_deadline)) {
                    throw new Error(`Task ${taskIndex + 1} (${task.task_name}) has invalid soft deadline format`);
                }
                if (!dateRegex.test(task.hard_deadline)) {
                    throw new Error(`Task ${taskIndex + 1} (${task.task_name}) has invalid hard deadline format`);
                }
                
                return {
                    task_name: task.task_name.trim(),
                    task_description: task.task_description.trim(),
                    soft_deadline: task.soft_deadline,
                    hard_deadline: task.hard_deadline
                };
            });
            
            return {
                stage_name: stage.stage_name.trim(),
                tasks: stage.tasks
            };
        });
        
        return parsed;
    } catch (error) {
        console.error("JSON Sanitization Error:", error);
        console.error("Original Response:", jsonString);
        throw error;
    }
};

export const generateTask = async (
    projQuestions,
    userResponses,
    teamCharterQuestions,
    teamCharterResponses,
) => {
    try {
        const today = new Date().toISOString().split("T")[0];

        // Extract project information from team charter responses
        const projectInfo = {
            projectPurpose: teamCharterResponses[0] || "",
            keyStakeholders: teamCharterResponses[1] || "",
            productObjectives: teamCharterResponses[2] || "",
        };

        // Extract team information
        const teamInfo = {
            teamStructure: teamCharterResponses[3] || "",
            communicationPreferences: teamCharterResponses[4] || "",
            workingStyle: teamCharterResponses[5] || "",
        };

        // Extract timeline information
        const timelineInfo = {
            projectDuration: teamCharterResponses[6] || "",
            majorMilestones: teamCharterResponses[7] || "",
            teamAvailability: teamCharterResponses[8] || "",
        };

        // Extract additional information
        const additionalInfo = {
            successCriteria: teamCharterResponses[9] || "",
            risksAndChallenges: teamCharterResponses[10] || "",
            resourceRequirements: teamCharterResponses[11] || "",
        };

        // Validate inputs
        if (!projectInfo.projectPurpose || !projectInfo.keyStakeholders || !projectInfo.productObjectives) {
            throw new Error("Missing required project information.");
        }

        if (!teamCharterResponses || teamCharterResponses.length === 0) {
            throw new Error("The team charter is empty.");
        }

        const context = `You are an experienced project manager AI assistant.

Given the following information:
- Project Purpose: ${projectInfo.projectPurpose}
- Key Stakeholders: ${projectInfo.keyStakeholders}
- Product Objectives: ${projectInfo.productObjectives}
- Project Duration: ${timelineInfo.projectDuration}
- Risks and Challenges: ${additionalInfo.risksAndChallenges}
- Team Members Survey Responses: ${userResponses.join(", ")}

Break down the project into logical stages (avoid names like "Stage 1", use meaningful names).
Each stage MUST contain at least 5-6 detailed tasks, broken down to the most granular level possible.

Task Breakdown Guidelines:
1. Break each major stages into smaller, actionable tasks
2. Each stages should be completable within 1-2 weeks
3. Each task should have a measurable outcome and specific, realistic actions 
4. Include both technical and non-technical tasks where applicable

Example of Task Granularity:
Instead of: "Build user authentication"
Break it down into:
- Set up authentication service configuration
- Implement login form UI components
- Create API endpoints for authentication
- Add form validation and error handling
- Implement session management
- Add password reset functionality
- Set up email verification system
- Add OAuth integration for social login
- Implement remember me functionality
- Add security headers and CSRF protection

Instead of: "Create dashboard page"
Break it down into:
- Create dashboard layout structure
- Implement navigation sidebar
- Add user profile section
- Create data visualization components
- Implement data fetching logic
- Add loading states and error handling
- Create responsive grid layout
- Implement data filtering system
- Add export functionality
- Create dashboard settings panel

For each task:
- Describe the task clearly and specifically
- Assign a soft deadline and a hard deadline (YYYY-MM-DD), based on today's date: ${today}
- Ensure dependencies are considered (i.e., no downstream tasks before upstream ones)
- Keep the plan practical and aligned with team member roles and workload preferences
- Consider project milestones in deadline planning

Common project stages for reference (but not limited to):
1. Research & Planning:
   - Stakeholder interviews
   - Requirements documentation
   - Technical architecture planning
   - Technology stack selection
   - Development environment setup
   - Project timeline planning

2. Design & Prototyping:
   - User flow mapping
   - Wireframe creation
   - UI component design
   - Design system setup
   - Interactive prototype development
   - Design review and feedback

3. MVP Development:
   - Database schema design
   - API endpoint implementation
   - Core feature development
   - Authentication system
   - Frontend components
   - Integration testing

4. Testing & QA:
   - Unit test implementation
   - Integration test setup
   - User acceptance testing
   - Performance testing
   - Security audit
   - Bug fixing and optimization

5. Launch Preparation:
   - Deployment pipeline setup
   - Documentation writing
   - User guide creation
   - Production environment setup
   - Monitoring system setup
   - Backup system implementation

6. Post-Launch:
   - Usage analytics setup
   - Feedback collection system
   - Performance monitoring
   - Bug tracking system
   - Feature enhancement planning
   - Maintenance schedule setup

Remember: Each stage should have AT LEAST 5-6 detailed tasks, and complex features should be broken down into multiple smaller tasks.

Output your response in the following JSON schema format.`;

        const input = `
                    Team Charter Questions:
                    ${teamCharterQuestions.join("\n")}

                    Project Information:
                    ${JSON.stringify(projectInfo, null, 2)}

                    Team Information:
                    ${JSON.stringify(teamInfo, null, 2)}

                    Timeline Information:
                    ${JSON.stringify(timelineInfo, null, 2)}

                    Additional Information:
                    ${JSON.stringify(additionalInfo, null, 2)}

                    Member Survey Questions:
                    ${projQuestions.join("\n")}

                    Member Survey Responses:
                    ${userResponses.join("\n")}
                    `;

        const result = await apiRequest({ context, responseFormat, input, functionName: "generateTask" });
        
        // Sanitize and parse the response
        const sanitizedData = sanitizeAndParseJSON(result);
        
        // Convert back to string with proper formatting
        return JSON.stringify(sanitizedData, null, 2);
    } catch (error) {
        console.error("Generate Task Error:", error);
        if (error.message.includes("Unterminated string")) {
            throw new Error("AI response format error. Please try again.");
        }
        throw error;
    }
};

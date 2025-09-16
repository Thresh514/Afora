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
                                description: "A list of tasks associated with this stage. The number of tasks in each stage should match the number of team members.",
                                minItems: 1,
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
                                        },
                                        assigned_member: {
                                            type: "string",
                                            description: "Email address of the team member assigned to this task based on their skills and interests",
                                            minLength: 1
                                        },
                                        assignment_reason: {
                                            type: "string",
                                            description: "Brief explanation of why this member was assigned to this task based on their capabilities and interests",
                                            minLength: 1
                                        }
                                    },
                                    required: ["task_name", "task_description", "soft_deadline", "hard_deadline", "assigned_member", "assignment_reason"],
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
    console.log("=== JSON Sanitization Process ===");
    console.log("Input JSON string length:", jsonString?.length || 0);
    
    try {
        // Remove any potential Unicode control characters
        console.log("Removing Unicode control characters...");
        const cleaned = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        console.log("Cleaned string length:", cleaned.length);
        
        // Try to find the actual JSON content (in case AI adds extra text)
        console.log("Extracting JSON content...");
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("❌ No valid JSON object found in response");
            console.log("Response content (first 1000 chars):", cleaned.substring(0, 1000));
            throw new Error("No valid JSON object found in response");
        }
        
        const jsonContent = jsonMatch[0];
        console.log("Extracted JSON content length:", jsonContent.length);
        
        // Parse and validate the JSON structure
        console.log("Parsing JSON content...");
        const parsed = JSON.parse(jsonContent);
        console.log("✅ JSON parsed successfully");
        
        // Validate the required structure
        console.log("Validating JSON structure...");
        if (!parsed.stages || !Array.isArray(parsed.stages)) {
            console.error("❌ Invalid response format: missing or invalid stages array");
            console.log("Parsed object keys:", Object.keys(parsed));
            throw new Error("Invalid response format: missing or invalid stages array");
        }
        console.log("✅ JSON structure validation passed");
        console.log("Number of stages found:", parsed.stages.length);
        
        // Validate and sanitize each stage
        console.log("Validating and sanitizing stages...");
        parsed.stages = parsed.stages.map((stage, index) => {
            console.log(`Processing Stage ${index + 1}: "${stage.stage_name}"`);
            
            if (!stage.stage_name || typeof stage.stage_name !== 'string') {
                console.error(`❌ Stage ${index + 1} has invalid or missing name`);
                throw new Error(`Stage ${index + 1} has invalid or missing name`);
            }
            
            if (!stage.tasks || !Array.isArray(stage.tasks) || stage.tasks.length < 1) {
                console.error(`❌ Stage ${index + 1} (${stage.stage_name}) must have at least 1 task`);
                console.log(`  Tasks found:`, stage.tasks);
                throw new Error(`Stage ${index + 1} (${stage.stage_name}) must have at least 1 task`);
            }
            
            console.log(`  Stage has ${stage.tasks.length} tasks`);
            
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
                
                // Validate assignment fields
                if (!task.assigned_member || typeof task.assigned_member !== 'string') {
                    throw new Error(`Task ${taskIndex + 1} (${task.task_name}) has invalid or missing assigned member`);
                }
                if (!task.assignment_reason || typeof task.assignment_reason !== 'string') {
                    throw new Error(`Task ${taskIndex + 1} (${task.task_name}) has invalid or missing assignment reason`);
                }

                return {
                    task_name: task.task_name.trim(),
                    task_description: task.task_description.trim(),
                    soft_deadline: task.soft_deadline,
                    hard_deadline: task.hard_deadline,
                    assigned_member: task.assigned_member.trim(),
                    assignment_reason: task.assignment_reason.trim()
                };
            });
            
            return {
                stage_name: stage.stage_name.trim(),
                tasks: stage.tasks
            };
        });
        
        console.log("✅ All stages and tasks validated successfully");
        return parsed;
    } catch (error) {
        console.error("=== JSON Sanitization Error ===");
        console.error("Error Type:", error.name);
        console.error("Error Message:", error.message);
        console.error("Original Response Length:", jsonString?.length || 0);
        console.error("Original Response (first 1000 chars):", jsonString?.substring(0, 1000) || "No response");
        throw error;
    }
};

export const generateTask = async (
    projQuestions,
    userResponses,
    teamCharterQuestions,
    teamCharterResponses,
    teamMembers, // Array of team member objects with email, skills, interests, etc.
    memberCapabilities, // Array of member capability analysis from team compatibility analysis
) => {
    try {
        const today = new Date().toISOString().split("T")[0];

        // Extract project information from team charter responses
        const projectInfo = {
            projectPurpose: teamCharterResponses[0] || "", // Main mission/vision
            keyMilestones: teamCharterResponses[1] || "", // Key milestones
            targetDemographic: teamCharterResponses[2] || "", // Target demographic
        };

        // Extract timeline information
        const timelineInfo = {
            projectDuration: teamCharterResponses[3] || "", // Expected duration (weeks)
            risksAndChallenges: teamCharterResponses[4] || "", // Risks and challenges
        };

        // Validate required inputs (questions 1, 2, and 3 are required)
        if (!projectInfo.projectPurpose || !projectInfo.keyMilestones || !timelineInfo.projectDuration) {
            throw new Error("Missing required project information. Please complete questions 1, 2, and 3 in the team charter.");
        }

        if (!teamCharterResponses || teamCharterResponses.length === 0) {
            throw new Error("The team charter is empty.");
        }

        if (!teamMembers || teamMembers.length === 0) {
            throw new Error("Team members information is required for task assignment.");
        }

        if (!memberCapabilities || memberCapabilities.length === 0) {
            throw new Error("Member capabilities analysis is required for intelligent task assignment.");
        }

        const teamSize = teamMembers.length;

        console.log("=== Generate Task API Call Debug Info ===");
        console.log("Team Size:", teamSize);
        console.log("Team Members:", teamMembers.map(m => m.email));
        console.log("Project Info:", projectInfo);
        console.log("Team Charter Response Length:", teamCharterResponses.length);
        console.log("Member Capabilities Count:", memberCapabilities.length);

        const context = `You are an experienced project manager AI assistant with expertise in intelligent task assignment.

Given the following information:
- Project Purpose: ${projectInfo.projectPurpose}
- Key Milestones: ${projectInfo.keyMilestones}
- Target Demographic: ${projectInfo.targetDemographic}
- Project Duration: ${timelineInfo.projectDuration}
- Risks and Challenges: ${timelineInfo.risksAndChallenges}
- Team Size: ${teamSize} members
- Team Members Survey Responses: ${userResponses.join(", ")}

TEAM MEMBERS INFORMATION:
${teamMembers.map((member, index) => `
Member ${index + 1}: ${member.email}
- Skills/Expertise: ${member.skills || 'Not specified'}
- Interests: ${member.interests || 'Not specified'}
- Career Goals: ${member.careerGoals || 'Not specified'}
`).join('\n')}

MEMBER CAPABILITIES ANALYSIS:
${memberCapabilities.map((capability, index) => `
${capability.member_email}:
- Technical Strengths: ${capability.strengths?.join(', ') || 'Not specified'}
- Skills: ${capability.skills?.join(', ') || 'Not specified'}
- Role Suggestion: ${capability.role_suggestion || 'Not specified'}
- Compatibility Score: ${capability.compatibility_score || 'Not specified'}
`).join('\n')}

TASK GENERATION AND ASSIGNMENT GUIDELINES:

1. **Stage and Task Structure:**
   - Break down the project into logical stages (avoid names like "Stage 1", use meaningful names)
   - Each stage MUST contain exactly ${teamSize} tasks (one task per team member)
   - Each task should be completable within 1-2 weeks
   - Tasks should be specific, actionable, and have measurable outcomes

2. **Intelligent Task Assignment:**
   - Assign each task to the most suitable team member based on their technical capabilities, interests, and career goals
   - Consider the member capabilities analysis and role suggestions
   - Balance workload across team members
   - Ensure task assignments align with individual strengths and development goals
   - Consider future industry alignment and career aspirations

3. **Assignment Criteria (in order of priority):**
   - Technical skill match (40%): Assign tasks that match member's technical expertise
   - Interest alignment (35%): Consider member's stated interests and career goals
   - Learning opportunity (25%): Provide growth opportunities aligned with career aspirations

4. **Task Assignment Rules:**
   - Each member should receive exactly one task per stage
   - No member should be assigned the same type of task in consecutive stages
   - Consider the complexity and member's experience level
   - Provide clear assignment reasoning based on member's profile

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
- Assign the most suitable team member using their email address
- Provide a clear reasoning for the assignment based on the member's capabilities and interests
- Assign a soft deadline and a hard deadline (YYYY-MM-DD), based on today's date: ${today}
- Ensure dependencies are considered (i.e., no downstream tasks before upstream ones)
- Keep the plan practical and aligned with team member roles and workload preferences
- Consider project milestones in deadline planning

ASSIGNMENT EXAMPLE:
Task: "Implement user authentication API endpoints"
Assigned Member: "john.doe@example.com"
Assignment Reason: "John has strong backend development skills with Node.js and Express, and has expressed interest in security-focused development. This aligns with his career goal of becoming a senior backend engineer."

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

Remember: Each stage should have EXACTLY ${teamSize} tasks (one per team member), and complex features should be broken down into multiple smaller tasks distributed across stages.

CRITICAL REQUIREMENTS:
- Each stage must have exactly ${teamSize} tasks
- Each task must be assigned to a different team member (use email addresses)
- Provide clear assignment reasoning for each task
- Ensure fair workload distribution across all stages
- Consider member growth and learning opportunities

Output your response in the following JSON schema format.`;

        const input = `
                    Team Charter Questions:
                    ${teamCharterQuestions.join("\n")}

                    Project Information:
                    ${JSON.stringify(projectInfo, null, 2)}

                    Timeline Information:
                    ${JSON.stringify(timelineInfo, null, 2)}

                    Team Members Information:
                    ${JSON.stringify(teamMembers, null, 2)}

                    Member Capabilities Analysis:
                    ${JSON.stringify(memberCapabilities, null, 2)}

                    Member Survey Questions:
                    ${projQuestions.join("\n")}

                    Member Survey Responses:
                    ${userResponses.join("\n")}
                    `;

        console.log("=== API Request Details ===");
        console.log("Context length:", context.length);
        console.log("Input length:", input.length);
        console.log("Function Name:", "generateTask");
        console.log("Response Format Schema:", JSON.stringify(responseFormat, null, 2));
        
        console.log("=== Calling GPT API ===");
        const apiStartTime = Date.now();
        
        const result = await apiRequest({ context, responseFormat, input, functionName: "generateTask" });
        
        const apiEndTime = Date.now();
        console.log("=== API Response Received ===");
        console.log("API Response Time:", `${apiEndTime - apiStartTime}ms`);
        console.log("Raw API Response Length:", result?.length || 0);
        console.log("Raw API Response (first 500 chars):", result?.substring(0, 500) || "No response");
        
        // Sanitize and parse the response
        console.log("=== Processing API Response ===");
        console.log("Starting JSON sanitization and parsing...");
        
        const sanitizedData = sanitizeAndParseJSON(result);
        
        console.log("=== Sanitized Data Overview ===");
        console.log("Number of stages generated:", sanitizedData.stages?.length || 0);
        if (sanitizedData.stages) {
            sanitizedData.stages.forEach((stage, index) => {
                console.log(`Stage ${index + 1}: "${stage.stage_name}" with ${stage.tasks?.length || 0} tasks`);
                if (stage.tasks) {
                    stage.tasks.forEach((task, taskIndex) => {
                        console.log(`  Task ${taskIndex + 1}: "${task.task_name}" assigned to "${task.assigned_member}"`);
                    });
                }
            });
        }
        
        // Additional validation: ensure task count matches team size
        console.log("=== Validation Process ===");
        console.log("Starting task assignment validation...");
        
        if (sanitizedData.stages) {
            sanitizedData.stages.forEach((stage, stageIndex) => {
                console.log(`Validating Stage ${stageIndex + 1}: "${stage.stage_name}"`);
                console.log(`  Expected tasks: ${teamSize}, Actual tasks: ${stage.tasks.length}`);
                
                if (stage.tasks.length !== teamSize) {
                    console.error(`❌ Task count mismatch in stage ${stageIndex + 1}`);
                    throw new Error(`Stage ${stageIndex + 1} (${stage.stage_name}) has ${stage.tasks.length} tasks but should have exactly ${teamSize} tasks (one per team member)`);
                }
                
                // Validate that each team member is assigned exactly once per stage
                const assignedMembers = new Set();
                stage.tasks.forEach((task, taskIndex) => {
                    console.log(`  Checking assignment: "${task.task_name}" → "${task.assigned_member}"`);
                    
                    if (assignedMembers.has(task.assigned_member)) {
                        console.error(`❌ Duplicate assignment detected: ${task.assigned_member}`);
                        throw new Error(`Stage ${stageIndex + 1} (${stage.stage_name}): Member ${task.assigned_member} is assigned to multiple tasks. Each member should be assigned exactly one task per stage.`);
                    }
                    assignedMembers.add(task.assigned_member);
                    
                    // Validate that assigned member exists in team
                    const memberExists = teamMembers.some(member => member.email === task.assigned_member);
                    if (!memberExists) {
                        console.error(`❌ Invalid member assignment: ${task.assigned_member}`);
                        throw new Error(`Stage ${stageIndex + 1} (${stage.stage_name}), Task ${taskIndex + 1}: Assigned member ${task.assigned_member} is not in the team member list`);
                    }
                });
                
                console.log(`✅ Stage ${stageIndex + 1} validation passed`);
            });
        }
        
        console.log("✅ All validations passed successfully!");
        
        // Convert back to string with proper formatting
        console.log("=== Final Result ===");
        console.log("Successfully generated and validated task assignments");
        console.log("Returning formatted JSON response");
        
        return JSON.stringify(sanitizedData, null, 2);
    } catch (error) {
        console.error("=== ERROR in Generate Task ===");
        console.error("Error Type:", error.name);
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack);
        if (error.message.includes("Unterminated string")) {
            throw new Error("AI response format error. Please try again.");
        }
        throw error;
    }
};

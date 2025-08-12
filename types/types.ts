import { DocumentData, Timestamp } from "firebase/firestore";

/**
 * - editor: members who can edit the documents
 * - admin: administrators who have higher access
 */
export const access_roles: string[] = ["editor", "admin"];

export type User = {
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    emailAddresses: string;
    imageUrl: string;
    unsafeMetadata: {
        demographic?: string; // Use optional chaining here
        gender?: string;
    };
};

export type Project = {
    projId: string;
    orgId: string;
    title: string;
    members: string[];
    admins: string[];
    teamCharterResponse: string[];
    projectType?: string; // 项目类型：Frontend, Backend, Mobile等
    teamSize?: number; // 团队大小配置
    createdAt?: string;
    description?: string;
    // Add other fields as necessary
};

export type ProjectStats = {
    totalTasks: number;
    completedTasks: number;
    totalStages: number;
    completedStages: number;
    progress: number; // 0-100
    memberCount: number;
    projectType: string;
};

export type Organization = {
    title: string;
    description: string;
    admins: string[];
    members: string[];
    backgroundImage: string;
};

// this structure describes the subcollection 'org' document under each user
// orgId and userId are not repetitive and are needed for quick query when deleting organizations
export interface UserOrgData extends DocumentData {
    createdAt: string;
    role: string;
    orgId: string;
    userId: string;
}

export const appHeader = [
    "Core Skills and Expertise",
    "Current Interests",
    "Fields Seeking to Pursue",
];
export const appQuestions = [
    "What is your primary area of expertise and main professional skills?",
    "What industries or fields are you currently most interested in some levels of skills and experiences?",
    "What future roles or job titles are you aiming for?",
];
export const appTags = [
    "Web Development",
    "Data Science",
    "UI/UX Design",
    "Product Management",
    "Cybersecurity",
    "Machine Learning",
    "Software Engineering",
    "Cloud Computing",
    "Project Management",
    "Business Analysis",
    "Graphic Design",
    "DevOps",
    "Quality Assurance",
    "Digital Marketing",
    "Content Writing",
    "Video Editing",
    "Game Development",
    "Mobile Development",
    "Systems Architecture",
    "Data Engineering",
    "Blockchain",
    "SEO",
    "Network Security",
    "Copywriting",
    "Sales",
    "Customer Support",
    "Financial Analysis",
    "Human Resources",
    "IT Support",
    "Deep Learning",
    "NLP",
    "Operations Management",
    "E-commerce",
    "Legal Consulting",
    "Data Analysis",
    "Statistics",
    "Risk Management",
    "IT Consulting",
    "Supply Chain",
    "UI Design",
    "UX Research",
    "Visual Design",
    "Animation",
    "Social Media",
    "Advertising",
    "Brand Strategy",
    "Research",
    "Public Relations",
    "Fundraising",
    "Training",
    "Health Informatics",
    "Clinical Research",
    "Education",
    "Economics",
    "Physics",
    "Healthcare",
    "Psychology",
    "Environmental Science",
    "Logistics",
    "Electronics",
    "Embedded Systems",
    "Robotics",
    "Manufacturing",
    "Mechanical Engineering",
    "Civil Engineering",
    "Electrical Engineering",
    "Chemical Engineering",
    "Artificial Intelligence",
    "Customer Experience",
    "Talent Acquisition",
    "Corporate Strategy",
    "Policy Analysis",
    "Event Planning",
];

// TODO: moved to somewhere else beause questions can be customized by org admin
export const projHeader = [
    "Hard Skills",
    "Communication Style",
    "Project Preferences",
    "Extreme Preferences",
    "Time Availability",
];

export const projQuestions = [
    "What are your top three technical or professional skills? Which tools, frameworks, or technologies are you proficient in?",
    "What is your preferred method of communication for this project? (e.g., Slack, Email, Video calls) How often do you prefer to receive updates or engage with teammates? (e.g., daily, weekly)",
    "What kind of project structure do you prefer? (e.g., rigid with clear processes, or flexible with more autonomy) What industry or type of project excites you most for this specific collaboration?",
    "Anyone you definitely want to work with for this project? Someone you definitely do not want to work with for this project?",
    "What days and times are you available to work on this project? (Please share a preferred weekly schedule or select available times like in When2Meet)",
];

export const teamCharterQuestions = [
    "What is the main mission/vision of the project?",
    "List key project milestones",
    "Target Demographic (Who are you building the product/service for)",
    "Expected project duration (in weeks)",
    "Potential Risks, Challenges, and Constraints (Identify possible risks and challenges)",
];

// export interface Task {
//     id: string
//     title: string
//     column: string
//     assigned: Array<string>
//     date: string
// }

export type Stage = {
    id: string;
    title: string;
    order: number;
    tasksCompleted: number;
    totalTasks: number;
};

export type Task = {
    id: string;
    title: string;
    description: string;
    soft_deadline: string;
    hard_deadline: string;
    assignee: string;
    assignment_reason?: string; // AI-generated reason for task assignment based on member capabilities
    order: number;
    isCompleted: boolean;
    completion_percentage?: number; // Task completion percentage (0-100)
    // Task pool related fields
    points: number; // Points earned for completing the task (default: 10)
    status: "available" | "assigned" | "completed" | "overdue"; // Task status
    assignedAt?: string; // When the task was assigned
    completedAt?: string; // When the task was completed
    canBeReassigned?: boolean; // Whether the task can be reassigned after soft deadline
    auto_dropped_at?: string; // When the task was automatically dropped by Cloud Function
};

export type GeneratedTasks = {
    stages: {
        stage_name: string; // The name of the stage
        tasks: {
            task_name: string; // The name of the task
            task_description: string; // The detailed description of the task
            soft_deadline: string;
            hard_deadline: string;
            assigned_member: string; // Email address of the assigned team member
            assignment_reason: string; // Reason for the assignment based on capabilities and interests
        }[];
    }[];
};

export type Comment = {
    message: string;
    msgId: string;
    time: Timestamp;
    uid: string;
};

export type TeamCompatibilityAnalysis = {
    score_breakdown: {
        technical_alignment: number;
        schedule_compatibility: number;
        interest_alignment: number;
        communication_alignment: number;
        work_style_compatibility: number;
        weight_applied: {
            technical_alignment: number;
            schedule_compatibility: number;
            interest_alignment: number;
            communication_alignment: number;
            work_style_compatibility: number;
        };
        calculation_comment: string;
    };
    member_analyses: {
        member_email: string;
        strengths: string[];
        skills: string[];
        interests: string[];
        compatibility_score: number;
        role_suggestion: string;
        detailed_analysis: {
            technical_proficiency: {
                score: number;
                strengths: string[];
                areas_for_improvement: string[];
            };
            collaboration_style: {
                preferred_methods: string[];
                communication_frequency: string;
                team_role: string;
            };
            project_contribution: {
                primary_responsibilities: string[];
                potential_impact: string;
                risk_factors: string[];
            };
        };
    }[];
    team_analysis: {
        team_strengths: string[];
        potential_gaps: string[];
        collaboration_potential: string;
        recommendations: string[];
        project_fit: {
            technical_alignment: number;
            schedule_compatibility: number;
            interest_alignment: number;
            charter_alignment: {
                vision_alignment: number;
                values_compatibility: number;
                key_findings: string[];
                detailed_assessment: {
                    shared_values: string[];
                    potential_conflicts: string[];
                    team_culture: string;
                    decision_making: string;
                };
            };
            technical_assessment: {
                skill_coverage: {
                    strong_areas: string[];
                    weak_areas: string[];
                    coverage_percentage: number;
                };
                technology_stack: {
                    frontend: string[];
                    backend: string[];
                    other: string[];
                };
                expertise_distribution: {
                    junior: number;
                    mid: number;
                    senior: number;
                };
            };
            schedule_assessment: {
                overlap_hours: number;
                peak_availability: string[];
                timezone_distribution: string[];
                flexibility_score: number;
            };
            comments: string[];
        };
    };
};

// Task pool and leaderboard types
export type UserScore = {
    userId: string;
    email: string;
    totalPoints: number;
    tasksCompleted: number;
    tasksAssigned: number;
    averageCompletionTime: number; // in hours
    streak: number; // consecutive days with completed tasks
};

export type ProjectLeaderboard = {
    projectId: string;
    projectTitle: string;
    scores: UserScore[];
    lastUpdated: string;
};

export type TaskPoolStats = {
    stageId: string;
    totalTasks: number;
    availableTasks: number;
    assignedTasks: number;
    completedTasks: number;
    overdueTasks: number;
};

export interface StageProgress {
    stageOrder: number;
    totalTasks: number;
    tasksCompleted: number;
    locked: boolean;
}

export interface TeamScoreCardProps {
    orgId: string;
    members: string[];
    projectFilter?: string;
    initialAnalysis: TeamCompatibilityAnalysis | null;
    lastAnalysisTime: Date | null;
}
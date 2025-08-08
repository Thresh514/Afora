"use client";
import React, { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, AlertCircle, CheckCircle, BarChart3, Users } from "lucide-react";
import { analyzeTeamCompatibility } from "@/ai_scripts/analyzeTeamCompatibility";
import { appQuestions, projQuestions, TeamCompatibilityAnalysis, TeamScoreCardProps } from "@/types/types";
import { getProjectMembersResponses, saveTeamAnalysis, getProjectTeamCharter } from "@/actions/actions";
import { toast } from "sonner";

interface MemberData {
    email: string;
    onboardingResponses: string[];
    projResponses: string[];
}

const TeamScoreCard = ({
    members,
    projectFilter,
    initialAnalysis,
    lastAnalysisTime,
}: TeamScoreCardProps) => {
    const [analysis, setAnalysis] = useState<TeamCompatibilityAnalysis | null>(initialAnalysis);
    const [isPending, startTransition] = useTransition();
    const [analysisTime, setAnalysisTime] = useState<Date | null>(lastAnalysisTime);

    // 当 props 更新时同步状态
    useEffect(() => {
        setAnalysis(initialAnalysis);
        setAnalysisTime(lastAnalysisTime);
    }, [initialAnalysis, lastAnalysisTime]);

    const handleAnalyzeTeam = async () => {
        startTransition(() => {
            (async () => {
                try {
                    if (!projectFilter) {
                        toast.error("Team ID is required for analysis");
                        return;
                    }
                    const membersData = await getProjectMembersResponses(projectFilter);

                    if (
                        !membersData.success ||
                        !membersData.data ||
                        membersData.data.length === 0
                    ) {
                        toast.error("No team member survey responses found");

                        const memberResponses: string[] = [];
                        
                        // 获取 team charter 数据
                        const teamCharterData = await getProjectTeamCharter(projectFilter);
                        const teamCharterResponse = teamCharterData.success ? teamCharterData.data : [];
                        
                        console.log("Team charter data (no members):", teamCharterResponse);

                        const result = await analyzeTeamCompatibility(
                            appQuestions,
                            memberResponses,
                            teamCharterResponse,
                            projQuestions
                        );
                        const parsedResult: TeamCompatibilityAnalysis = JSON.parse(result);
                        setAnalysis(parsedResult);
                        
                        // 保存分析结果
                        if (projectFilter) {
                            await saveTeamAnalysis(projectFilter, parsedResult);
                            setAnalysisTime(new Date());
                            toast.success("Team analysis completed and saved!");
                        } else {
                            toast.success("Team analysis completed!");
                        }
                        return;
                    }

                    // 添加调试信息
                    console.log("Project members data:", membersData.data);
                    console.log("Expected members count:", members.length);
                    
                    // 调试每个成员的数据
                    membersData.data.forEach((member, index) => {
                        console.log(`Member ${index + 1}: ${member.email}`);
                        console.log(`  Onboarding responses:`, member.onboardingResponses);
                        console.log(`  Project responses:`, member.projResponses);
                        console.log(`  Project responses length:`, member.projResponses?.length || 0);
                    });
                    
                    const memberResponses = membersData.data.map(
                        (member: MemberData) => {
                            // onboardingResponses
                            const answers = member.onboardingResponses;
                            // projResponses
                            const projAnswers = member.projResponses;
                            
                            return `User: ${member.email}
                                    Onboarding Question 1 Answer: ${answers[0] || "No answer"}
                                    Onboarding Question 2 Answer: ${answers[1] || "No answer"}
                                    Onboarding Question 3 Answer: ${answers[2] || "No answer"}
                                    
                                    Project Onboarding Question 1 (Technical Skills): ${projAnswers[0] || "No answer"}
                                    Project Onboarding Question 2 (Communication): ${projAnswers[1] || "No answer"}
                                    Project Onboarding Question 3 (Project Structure): ${projAnswers[2] || "No answer"}
                                    Project Onboarding Question 4 (Team Preferences): ${projAnswers[3] || "No answer"}
                                    Project Onboarding Question 5 (Time Availability): ${projAnswers[4] || "No answer"}`;
                        },
                    );
                    
                    console.log("Member responses count:", memberResponses.length);

                    // 获取 team charter 数据
                    const teamCharterData = await getProjectTeamCharter(projectFilter);
                    const teamCharterResponse = teamCharterData.success ? teamCharterData.data : [];
                    
                    console.log("Team charter data:", teamCharterResponse);

                    const result = await analyzeTeamCompatibility(
                        appQuestions,
                        memberResponses,
                        teamCharterResponse,
                        projQuestions
                    );
                    const parsedResult: TeamCompatibilityAnalysis = JSON.parse(result);
                    setAnalysis(parsedResult);

                    // 保存分析结果
                    if (projectFilter) {
                        await saveTeamAnalysis(projectFilter, parsedResult);
                        setAnalysisTime(new Date());
                        toast.success("Team analysis completed and saved!");
                    } else {
                        toast.success("Team analysis completed!");
                    }
                } catch (error) {
                    console.error("Analysis failed:", error);
                    toast.error("Analysis failed. Please try again.");
                    setAnalysis(null);
                }
            })();
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-green-600";
        if (score >= 80) return "text-blue-600";
        if (score >= 70) return "text-yellow-600";
        if (score >= 60) return "text-orange-600";
        return "text-red-600";
    };

    const getScoreDescription = (score: number) => {
        if (score >= 90) return "Excellent";
        if (score >= 80) return "Good";
        if (score >= 70) return "Average";
        if (score >= 60) return "Needs Improvement";
        return "Major Adjustments Needed";
    };

    const toSafeNumber = (value: unknown, fallback: number = 0): number => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        }
        return fallback;
    };
    
    const getCurveFactor = (
        score: number,
        options?: {
            minScore?: number;
            maxScore?: number;
            minFactor?: number; // 高分对应的较小系数
            maxFactor?: number; // 低分对应的较大系数
        }
    ): number => {
        const minScore = options?.minScore ?? 70;
        const maxScore = options?.maxScore ?? 90;
        const maxFactor = options?.maxFactor ?? 1.3;
        const minFactor = options?.minFactor ?? 1.1;

        if (!Number.isFinite(score)) return maxFactor;
        if (score <= minScore) return maxFactor;
        if (score >= maxScore) return minFactor;

        const t = (score - minScore) / (maxScore - minScore);
        return maxFactor - t * (maxFactor - minFactor);
    };

    const curveScore = (value: number): number => {
        const factor = getCurveFactor(value);
        const curved = value * factor;
        const clamped = Math.max(0, Math.min(100, curved));
        return Math.round(clamped);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        {projectFilter
                            ? "Team Compatibility Analysis"
                            : "Team Compatibility Analysis"}
                    </CardTitle>
                    <CardDescription>
                        Analyze team&apos;s overall compatibility and collaboration potential based on member onboarding surveys
                        {analysisTime && (
                            <div className="mt-2 text-sm text-muted-foreground">
                                Last analysis: {analysisTime.toLocaleString()}
                            </div>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!analysis ? (
                        <div className="text-center py-8">
                            <Button
                                onClick={handleAnalyzeTeam}
                                disabled={isPending}
                                size="lg"
                            >
                                {isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isPending
                                    ? "Analyzing..."
                                    : "Start Team Analysis"}
                            </Button>
                            <p className="text-sm text-muted-foreground mt-2">
                                Current team member count: {members.length}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleAnalyzeTeam}
                                    disabled={isPending}
                                    variant="outline"
                                    size="sm"
                                >
                                    {isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Refresh Analysis
                                </Button>
                            </div>

                            {/* Score Breakdown Visualization */}
                            {analysis.score_breakdown && (
                                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border">
                                    <div className="text-center mb-6">
                                        {/* Calculate overall score from score_breakdown */}
                                        {(() => {
                                            const breakdown = analysis.score_breakdown;
                                            const toNum = (v: unknown): number => {
                                                if (typeof v === "number" && Number.isFinite(v)) return v;
                                                if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
                                                return 0;
                                            };
                                            const rawScore =
                                                0.35 * toNum(breakdown.technical_alignment) +
                                                0.15 * toNum(breakdown.schedule_compatibility) +
                                                0.2 * toNum(breakdown.interest_alignment) +
                                                0.15 * toNum(breakdown.communication_alignment) +
                                                0.15 * toNum(breakdown.work_style_compatibility);
                                            const baseOverall = Math.round(Math.max(0, Math.min(100, rawScore)));
                                            const overallScore = curveScore(Number.isFinite(baseOverall) ? baseOverall : 0);
                                            return (
                                                <>
                                                    <div className={`text-5xl font-bold ${getScoreColor(overallScore)} mb-2`}>
                                                        {overallScore}
                                                    </div>
                                                    <div className="text-lg text-muted-foreground mb-2">
                                                        Overall Compatibility
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-600">
                                                        {getScoreDescription(overallScore)}
                                                    </div>
                                                    <Progress
                                                        value={overallScore}
                                                        className="w-full max-w-sm mx-auto mt-3"
                                                    />
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Score Breakdown Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {curveScore(toSafeNumber(analysis.score_breakdown.technical_alignment))}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">Technical</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {curveScore(toSafeNumber(analysis.score_breakdown.interest_alignment))}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">Interest</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {curveScore(toSafeNumber(analysis.score_breakdown.communication_alignment))}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">Communication</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600">
                                                {curveScore(toSafeNumber(analysis.score_breakdown.work_style_compatibility))}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">Work Style</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-indigo-600">
                                                {curveScore(toSafeNumber(analysis.score_breakdown.schedule_compatibility))}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">Schedule</div>
                                        </div>
                                    </div>

                                    {/* Calculation Comment */}
                                    {analysis.score_breakdown.calculation_comment && (
                                        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                                            <p className="text-sm text-slate-600">
                                                {analysis.score_breakdown.calculation_comment}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Team Analysis Summary */}
                            {analysis.team_analysis && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border border-green-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <h4 className="font-semibold text-green-700">Strengths</h4>
                                        </div>
                                        <div className="space-y-2">
                                            {analysis.team_analysis.team_strengths?.slice(0, 3).map((strength, index) => (
                                                <div key={index} className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                                                    {strength}
                                                </div>
                                            )) || (
                                                <div className="text-sm text-slate-500 italic">No strengths identified</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-4 border border-orange-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertCircle className="h-4 w-4 text-orange-600" />
                                            <h4 className="font-semibold text-orange-700">Gaps</h4>
                                        </div>
                                        <div className="space-y-2">
                                            {analysis.team_analysis.potential_gaps?.slice(0, 3).map((gap, index) => (
                                                <div key={index} className="text-sm text-orange-700 bg-orange-50 px-2 py-1 rounded">
                                                    {gap}
                                                </div>
                                            )) || (
                                                <div className="text-sm text-slate-500 italic">No gaps identified</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingUp className="h-4 w-4 text-blue-600" />
                                            <h4 className="font-semibold text-blue-700">Collaboration</h4>
                                        </div>
                                        <p className="text-sm text-blue-700 leading-relaxed">
                                            {analysis.team_analysis.collaboration_potential || "Collaboration potential not assessed"}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {analysis.team_analysis && (
                                <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 border border-purple-100">
                                    <h4 className="font-semibold text-purple-700 mb-3">Key Recommendations</h4>
                                    <div className="space-y-2">
                                        {analysis.team_analysis.recommendations?.slice(0, 3).map((rec, index) => (
                                            <div key={index} className="flex items-start gap-2">
                                                <span className="text-purple-600 mt-1">•</span>
                                                <span className="text-sm text-purple-700">{rec}</span>
                                            </div>
                                        )) || (
                                            <div className="text-sm text-slate-500 italic">No recommendations available</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Member Analysis */}
                            {analysis.member_analyses && analysis.member_analyses.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Member Analysis
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {analysis.member_analyses.map((member) => (
                                            <div key={member.member_email} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h5 className="font-medium text-slate-800">{member.member_email}</h5>
                                                        <Badge variant="outline" className="mt-1 text-xs">
                                                            {member.role_suggestion}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-right">
                                                        {(() => {
                                                            const memberScore = curveScore(toSafeNumber(member.compatibility_score));
                                                            return (
                                                                <div className={`text-lg font-bold ${getScoreColor(memberScore)}`}>
                                                                    {memberScore}
                                                                </div>
                                                            );
                                                        })()}
                                                        <div className="text-xs text-slate-500">Compatibility</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-xs font-medium text-slate-600 mb-1">Strengths</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {member.strengths?.slice(0, 2).map((strength, i) => (
                                                                <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                                                    {strength}
                                                                </Badge>
                                                            )) || (
                                                                <div className="text-xs text-slate-500 italic">No strengths listed</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="text-xs font-medium text-slate-600 mb-1">Skills</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {member.skills?.slice(0, 3).map((skill, i) => (
                                                                <Badge key={i} variant="outline" className="text-xs border-blue-300 text-blue-700">
                                                                    {skill}
                                                                </Badge>
                                                            )) || (
                                                                <div className="text-xs text-slate-500 italic">No skills listed</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TeamScoreCard;

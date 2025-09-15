"use client";

import { Button } from "@/components/ui/button";
import { 
    AlertDialog, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Check, 
    Crown, 
    Sparkles, 
    Zap, 
    Target, 
    Users, 
    BarChart3,
    ArrowRight
} from "lucide-react";

interface ProUpgradeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpgrade: () => void;
    onCancel: () => void;
}

const ProUpgradeDialog = ({ open, onOpenChange, onUpgrade, onCancel }: ProUpgradeDialogProps) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-full max-w-6xl p-0 overflow-hidden">
                {/* Header with gradient background */}
                <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-6 text-white relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                                <Crown className="h-8 w-8 text-yellow-300" />
                            </div>
                            <div>
                                <AlertDialogTitle className="text-3xl font-bold mb-2">
                                    Upgrade to Afora Pro
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-blue-100 text-lg">
                                    Make your team planning process more efficient and intelligent
                                </AlertDialogDescription>
                            </div>
                        </div>
                        
                        {/* Price badge */}
                        <div className="flex items-center gap-3 mt-6">
                            <Badge className="bg-yellow-400 text-yellow-900 px-4 py-2 text-lg font-bold">
                                Only $1.99/month
                            </Badge>
                            <span className="text-blue-100 text-sm">7-day free trial</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Features Column */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-purple-600" />
                                    Pro features unlocked
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-1 bg-green-100 rounded-full mt-1">
                                            <Check className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">AI-driven team charter generation</p>
                                            <p className="text-sm text-gray-600">AI-driven personalized team planning suggestions</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-1 bg-green-100 rounded-full mt-1">
                                            <Check className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Advanced project analysis</p>
                                            <p className="text-sm text-gray-600">Deep team compatibility and performance insights</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-1 bg-green-100 rounded-full mt-1">
                                            <Check className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Unlimited task generation</p>
                                            <p className="text-sm text-gray-600">AI automatically creates and optimizes project tasks</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-1 bg-green-100 rounded-full mt-1">
                                            <Check className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Priority customer support</p>
                                            <p className="text-sm text-gray-600">24/7 dedicated customer support and technical support</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Benefits Column */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-600" />
                                    Why choose Pro?
                                </h3>
                                <div className="space-y-3">
                                    <Card className="border-l-4 border-l-purple-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Target className="h-5 w-5 text-purple-600" />
                                                <span className="font-medium">Save 80% planning time</span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                AI smart assistant helps you quickly create a complete project plan
                                            </p>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Users className="h-5 w-5 text-blue-600" />
                                                <span className="font-medium">Improve team collaboration</span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Deep team analysis helps optimize member cooperation and task allocation
                                            </p>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card className="border-l-4 border-l-green-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <BarChart3 className="h-5 w-5 text-green-600" />
                                                <span className="font-medium">Data-driven decision-making</span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Real-time project insights and performance tracking, making management more scientific
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Call to action */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <div className="text-center">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                    🚀 Now upgrade, immediately experience Pro features!
                            </h4>
                            <p className="text-gray-600 mb-4">
                                Join the choice of over 10,000 teams, make project management easier
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <AlertDialogFooter className="bg-gray-50 p-6">
                    <div className="flex flex-col sm:flex-row gap-3 w-2/3">
                        <Button
                            onClick={onCancel}
                            variant="outline"
                            className="w-1/3 sm:flex-none"
                        >
                            Later
                        </Button>
                        <Button
                            onClick={onUpgrade}
                            className="w-2/3 sm:flex-none bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            <Crown className="mr-2 h-5 w-5" />
                            Start 7-day free trial
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                    <p className="w-1/3 text-xs text-gray-500 text-center p-1">
                        Cancel anytime • No hidden fees • 30-day money-back guarantee
                    </p>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ProUpgradeDialog;

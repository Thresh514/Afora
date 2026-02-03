"use client";

import OrganizationPage from "@/components/OrganizationPage";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import React from "react";
import { useEffect } from "react";
import ProjOnboarding from "@/components/ProjOnboarding";
import { useUser } from "@clerk/nextjs";
import { useDocument } from "react-firebase-hooks/firestore";
import { doc } from "firebase/firestore";
import { db } from "@/firebase";

function OrgPage() {
    const params = useParams();
    const { id } = params;
    
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();
    const { user } = useUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    // Check if user has completed the onboarding survey
    const [userData] = useDocument(
        userEmail && id ? doc(db, "users", userEmail, "orgs", id as string) : null,
    );
    const hasCompletedSurvey = userData?.data()?.projOnboardingSurveyResponse;

    useEffect(() => {
        // Redirect to login if the user is not authenticated
        if (isLoaded && !isSignedIn) {
            router.replace("/login");
        }
    }, [isLoaded, isSignedIn, router]);

    // Show onboarding if user hasn't completed the survey
    const shouldShowOnboarding = !hasCompletedSurvey && isSignedIn && userData !== undefined;

    return (
        <div className="flex flex-col h-full">
            {isSignedIn && (
                <>
                    <OrganizationPage id={id as string} />
                    {shouldShowOnboarding && (
                        <ProjOnboarding
                            orgId={id as string}
                            projId=""
                            onDismiss={() => {
                                // No need to modify URL, just close the dialog
                            }}
                        />
                    )}
                </>
            )}
        </div>
    );
}
export default OrgPage;

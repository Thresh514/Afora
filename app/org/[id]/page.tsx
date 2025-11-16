"use client";

import OrganizationPage from "@/components/OrganizationPage";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import React from "react";
import { useEffect } from "react";
import ProjOnboarding from "@/components/ProjOnboarding";

function OrgPage() {
    const params = useParams();
    const { id } = params;
    const searchParams = useSearchParams();
    const showOnboarding = searchParams.get("onboarding") === "1";
    
    const { isSignedIn, isLoaded } = useAuth(); // Get authentication state
    const router = useRouter();
    useEffect(() => {
        // Redirect to login if the user is not authenticated
        if (isLoaded && !isSignedIn) {
            router.replace("/"); // Redirect to the login page
        }
    }, [isLoaded, isSignedIn, router]);

    return (
        <div className="flex flex-col h-full">
            {isSignedIn && (
                <>
                    <OrganizationPage id={id as string} />
                    {showOnboarding && (
                        <ProjOnboarding
                            orgId={id as string}
                            projId=""
                            onDismiss={() => router.replace(`/org/${id}`)}
                        />
                    )}
                </>
            )}
        </div>
    );
}
export default OrgPage;

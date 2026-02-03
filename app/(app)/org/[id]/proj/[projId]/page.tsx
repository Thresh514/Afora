"use client";

import ProjectPage from "@/components/ProjectPage";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

export default function ProjPage() {
    const params = useParams();
    const { id, projId } = params;

    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.replace("/login");
        }
    }, [isLoaded, isSignedIn, router]);

    return (
        <div className="flex flex-col h-full">
            {isSignedIn && <ProjectPage id={id as string} projId={projId as string} />}
        </div>
    );
}
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { doc } from "firebase/firestore";
import { useDocument } from "react-firebase-hooks/firestore";
import { db } from "@/firebase";
import { Organization, UserOrgData } from "@/types/types";
import ImageSearchDialog from "./ImageSearchDialog";

interface OrgHeaderProps {
    id: string;
}

const OrgHeader = ({ id }: OrgHeaderProps) => {
    const { user } = useUser();
    const [showAccessCode, setShowAccessCode] = useState(false);

    const [org, loading, error] = useDocument(
        doc(db, "organizations", id),
    );
    
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const [data] = useDocument(
        userEmail ? doc(db, "users", userEmail, "orgs", id) : null,
    );

    const [userOrgData, setUserOrgData] = useState<UserOrgData>();

    // Handle userOrgData - moved before early returns
    useEffect(() => {
        if (data) {
            const userOrg = data.data() as UserOrgData;
            // console.log("OrganizationPage - User org data loaded:", userOrg);
            setUserOrgData(userOrg);
        } else if (!loading && userEmail && org) {
            const orgData = org.data() as Organization;
            const isAdmin = orgData?.admins?.includes(userEmail);
            const isMember = orgData?.members?.includes(userEmail);

            if (isAdmin || isMember) {
                // console.log(
                    "OrganizationPage - Creating default user org data. IsAdmin:",
                    isAdmin,
                );
                const defaultUserOrgData: UserOrgData = {
                    createdAt: new Date().toISOString(),
                    role: isAdmin ? "admin" : "member",
                    orgId: id,
                    userId: userEmail,
                };
                setUserOrgData(defaultUserOrgData);
            }
        }
    }, [data, loading, userEmail, org, id]);

    // Get orgData before any early returns
    const orgData = org?.data() as Organization;

    // Early returns after all hooks
    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    if (!org || !orgData) {
        return <div>No group found</div>;
    }

    return (
        <div className="overflow-x-hidden p-4">
            {/* Hero Section with Background Image */}
            <div className="relative w-full h-80 rounded-lg overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url(${orgData.backgroundImage})`,
                    }}
                />

                {/* Content Container */}
                <div className="relative h-full flex flex-col justify-between p-6">
                    {/* Top Section */}
                    <div className="flex justify-end items-start">
                        {/* Project Onboarding（已禁用，原引用自 ProjOnboarding.tsx） */}
                        {/* 
                         {user &&
                             orgData &&
                             orgData.admins &&
                             !orgData.admins.includes(userId) && (
                                 <div className="backdrop-blur-md bg-white/90 rounded-xl p-3 shadow-lg">
                                     <ProjOnboarding orgId={id} />
                                 </div>
                             )}
                        */}

                        {/* Image Search Dialog */}
                        <div className="relative">
                            <ImageSearchDialog orgId={id} />
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex justify-between items-end">
                        {/* Organization Title */}
                        <div className="flex-1">
                            <div className="backdrop-blur-md bg-white/75 rounded-xl p-4 inline-block">
                                <h1 className="text-5xl font-lighter tracking-wide text-gray-900 mb-2">
                                    {orgData.title}
                                </h1>
                                {orgData.description && (
                                    <p className="text-gray-700 text-lg max-w-2xl tracking-wide pl-2">
                                        {orgData.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Access Code Card */}
                        {userOrgData && userOrgData.role === "admin" && (
                            <div className="backdrop-blur-md bg-white/75 rounded-xl p-4 ">
                                <div className="text-sm font-medium text-gray-600 mb-1">
                                    Access Code
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="text-sm  font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded select-all">
                                        {showAccessCode ? userOrgData.orgId : "••••••••••••••••••••"}
                                    </code>
                                    <button
                                        type="button"
                                        className="focus:outline-none"
                                        onClick={() => setShowAccessCode((v) => !v)}
                                        title={showAccessCode ? "Hide" : "Show"}
                                    >
                                        {showAccessCode ? (
                                            <EyeOff className="w-4 h-4 text-gray-600 hover:text-gray-900 transition-colors" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-gray-600 hover:text-gray-900 transition-colors" />
                                        )}
                                    </button>
                                    <Copy
                                        className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
                                        onClick={() => {
                                            navigator.clipboard.writeText(userOrgData.orgId);
                                            toast.success("Access code copied to clipboard!");
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrgHeader;
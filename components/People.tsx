"use client";

import { db } from "@/firebase";
// import { useUser } from "@clerk/nextjs";
import { doc } from "firebase/firestore";
import { usePathname } from "next/navigation";
import { useDocument } from "react-firebase-hooks/firestore";

// pop document from next navigation
function People() {
    const pathname = usePathname();
    const roomId = pathname.split("/");
    // // console.log(pathname)
    // // console.log(roomId[2]);

    // const { user } = useUser();

    //// console.log("user Signed in:", user)
    // const [docSnapshot, loading, error] = useDocument(
    //   doc(db, 'documents', roomId[2])
    // );

    const [docSnapshot] = useDocument(doc(db, "documents", roomId[2]));

    const data = docSnapshot?.data();

    // console.log("data :", data);
    // console.log("members:", data?.members);

    return (
        <div>
            <div>
                <h1 className="font-bold">Admin</h1>
                {data?.admins &&
                    data?.admins.map((admin: string) => (
                        <div key={admin}>{admin}</div>
                    ))}
            </div>

            <div>
                <h1 className="font-bold">Members</h1>
                {data?.members.map((people: string) => (
                    <div key={people}>{people}</div>
                ))}
            </div>
        </div>
    );
}
export default People;

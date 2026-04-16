"use client";

import { db } from "@/firebase";
import { doc } from "firebase/firestore";
import Link from "next/link";
import { useDocumentData } from "react-firebase-hooks/firestore";

function SidebarOption({ id }: { id: string }) {
  const [data] = useDocumentData(doc(db, "organizations", id));

  if (!data) return null;

  const basePath = `/org/${id}`;

  return (
    <div className="py-2 pl-2 hover:bg-gray-300 rounded-xl">
      {/* <Accordion type="single" collapsible>
        <AccordionItem value="item-1" className="truncate">
          <AccordionTrigger>
            {data?.title}
          </AccordionTrigger>
          <AccordionContent>
            <Link href={basePath}>
              <p className="truncate hover:underline">Board</p>
            </Link>
          </AccordionContent>
        </AccordionItem>
      </Accordion> */}

      <Link href={basePath}>
        <p className="truncate border-e-indigo-50">{data?.title}</p>
      </Link>
    </div>
  );
}

export default SidebarOption;

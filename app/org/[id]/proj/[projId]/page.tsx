'use client';

import { Card, CardHeader } from "@/components/ui/card"

import { db } from "@/firebase";
import { useAuth } from "@clerk/nextjs";
import { collection, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useCollection, useDocument } from "react-firebase-hooks/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Stage, teamCharterQuestions } from "@/types/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EditIcon, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import { setTeamCharter } from "@/actions/actions";
import { toast } from "sonner";
import GenerateTasksButton from "@/components/GenerateTasksButton";
function ProjectPage({ params: { id, projId } }: {
  params: {
    id: string;
    projId: string;
  }
}) {
  const { isSignedIn, isLoaded } = useAuth(); // Get authentication state
  const [responses, setResponses] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    // Redirect to login if the user is not authenticated
    if (isLoaded && !isSignedIn) {
      router.replace('/'); // Redirect to the login page
    }
    console.log('projid', projId);
  }, []);

  const [stagesData, stagesLoading, stagesError] = useCollection(collection(db, 'projects', projId, 'stages'));
  const [teamCharterData, loading, error] = useDocument(doc(db, 'projects', projId));

  if (stagesLoading) {
    return <Skeleton className="w-full h-96" />;
  }
  if (stagesError) {
    return <div>Error: {stagesError.message}</div>;
  }

  const stages: Stage[] = stagesData?.docs.map(doc => ({
    ...(doc.data() as Stage)
  })) || [];


  const handleOpenEditing = () => {
    if (!teamCharterData || loading || error) return;
    // fetch the latest team charter data
    const res = (teamCharterData.data()?.teamCharterResponse as string[]) || [];
    setResponses(res);
  };

  const handleSaving = () => startTransition(async () => {
    if (!teamCharterData || loading || error) return;
    try {
      await setTeamCharter(projId, responses);
      toast.success('Team Charter saved successfully!');
    } catch (e) {
      console.log(e);
      toast.error('Failed to save Team Charter.');
    }
    setIsOpen(false);
  });

  return (
    <div className="w-full h-full flex flex-col">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {/* <TableHead className="text-xl font-bold text-black">Project Stages</TableHead> */}
            <div
              className="flex items-center justify-between bg-cover bg-center p-4 h-40"
              style={{ backgroundImage: "url('https://png.pngtree.com/thumb_back/fh260/background/20230408/pngtree-rainbow-curves-abstract-colorful-background-image_2164067.jpg')" }}
            >
              <h1 className="text-4xl font-bold m-4 text-white">
                Project Stages
              </h1>
            </div>
          </TableRow>
          <TableRow>
            <TableCell colSpan={2} className="px-4">
              <h2 className="text-lg font-semibold py-2">Goal Progress: 33%</h2>
              <Progress value={33} />
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stages.length === 0 ? (
            <>
              <TableRow>
                <TableCell colSpan={2} className="font-medium text-black">No stages. Try generate the stages and tasks.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <GenerateTasksButton
                    orgId={id}
                    projId={projId}
                    teamCharterResponses={teamCharterData?.data()?.teamCharterResponse || []}
                  />
                </TableCell>
                <TableCell>
                  <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                    <AlertDialogTrigger>
                      <Button onClick={handleOpenEditing}>
                        <EditIcon />Team Charter
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-full max-w-4xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Project Team Charter</AlertDialogTitle>
                        <AlertDialogDescription>
                          Fill out this charter to kick off your project! 🚀
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="overflow-y-auto max-h-96">
                        <form className="space-y-4 p-2">
                          {teamCharterQuestions.map((question, index) => (
                            <div key={index}>
                              <Label htmlFor={`question-${index}`}>{question}</Label>
                              <Textarea
                                id={`question-${index}`}
                                name={`question-${index}`}
                                value={responses[index] || ''}
                                onChange={(e) => {
                                  const newResponses = [...responses];
                                  newResponses[index] = e.target.value;
                                  setResponses(newResponses);
                                }}
                              />
                            </div>
                          ))}
                        </form>
                      </div>
                      <AlertDialogFooter>
                        <Button onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaving} disabled={isPending}>
                          {isPending ? <><Loader2 className="animate-spin" /> Loading</> : 'Save'}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            </>
          ) : (
            stages
              .sort((a, b) => a.order - b.order)
              .map((stage, index) => (

                <TableRow className="flex flex-1" key={index}>
                  <Link className="flex flex-1" href={`/org/${id}/proj/${projId}/stage/${stage.id}`}>
                    {/* <TableCell className="font-medium text-black whitespace-nowrap">{stage.order} - {stage.title}</TableCell> */}
                    <TableCell className="flex flex-1">
                      <Card className="w-full shadow-lg hover:shadow-3xl hover:translate-y-[-4px] transition-transform duration-300 h-auto">
                        <CardHeader className="p-0">
                          <div
                            className="bg-cover bg-center items-end justify-start p-4"
                          >
                            {index + 1} - {stage.title}
                          </div>
                        </CardHeader>
                      </Card>
                    </TableCell>
                  </Link>
                </TableRow>

              ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
export default ProjectPage
// import { X } from 'lucide-react';
// import { doc, updateDoc } from 'firebase/firestore';
// import { usePathname } from 'next/navigation';
// import { useForm } from 'react-hook-form';
// import { db } from '@/firebase';

// interface IFormInput {
//   email: string;
// }

// const AssignTask = ({ id, assigned }: { id: string; assigned: string[] }) => {
//   const { register, handleSubmit, reset } = useForm<IFormInput>();
//   const pathname = usePathname();
//   const projectId = pathname.split("/").pop();

//   const removeAssignee = async (emailToRemove: string) => {
//     try {
//       if (projectId) {
//         const updatedAssigned = assigned.filter(email => email !== emailToRemove);
//         await updateDoc(doc(db, "documents", projectId, "tasks", id), {
//           assigned: updatedAssigned
//         });
//       }
//     } catch (error) {
//       console.error("Error removing assignee:", error);
//     }
//   };

//   const onSubmit = async (data: IFormInput) => {
//     try {
//       if (projectId && data.email.trim()) {
//         const updatedAssigned = [...assigned, data.email];
//         await updateDoc(doc(db, "documents", projectId, "tasks", id), {
//           assigned: updatedAssigned
//         });
//       }
//       reset();
//     } catch (error) {
//       console.error("Error updating assignees:", error);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className='flex flex-row'>
//       <div className="border rounded-lg focus-within:ring-2 focus-within:ring-gray-500 focus-within:border-blue-500">
//         <div className="flex flex-wrap items-center p-2 gap-2">
//           {assigned && assigned.map((email, index) => (
//             <div
//               key={index}
//               className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm group"
//             >
//               <span>{email}</span>
//               <button
//                 type="button"
//                 onClick={() => removeAssignee(email)}
//                 className="opacity-60 group-hover:opacity-100 hover:text-red-500 focus:outline-none"
//               >
//                 <X size={14} />
//               </button>
//             </div>
//           ))}
//           <input
//             {...register("email")}
//             placeholder={assigned && assigned.length ? "Add another email" : "Enter email to assign"}
//             className="flex-1 min-w-[200px] p-1 outline-none bg-transparent"
//           />
//         </div>
//       </div>
//       <button
//         type="submit"
//         className="mt-2 w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 focus:ring-2 focus:ring-black focus:ring-offset-2"
//       >
//         Assign
//       </button>
//     </form>
//   );
// };

// export default AssignTask;

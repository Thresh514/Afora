import { useUser } from "@clerk/nextjs";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "./ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Inputs = {
    demographic: string;
    gender: string;
};

export default function Unsafe() {
    const { user } = useUser();
    const genders = ["Male", "Female", "Other"];
    const demographics = [
        "Middle/High School Student",
        "College Student",
        "Professional",
        "Personal",
    ];

    const {
        handleSubmit,
        formState: { errors },
        setValue,
        // watch,
    } = useForm<Inputs>({
        defaultValues: {
            gender: (user?.unsafeMetadata?.gender as string) || "",
            demographic: (user?.unsafeMetadata?.demographic as string) || "",
        },
    });

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        const currentGender = user?.unsafeMetadata?.gender;
        const currentDemographic = user?.unsafeMetadata?.demographic;

        // Create an object with fields that have changed
        const updatedMetadata: Partial<Inputs> = {};
        if (data.gender && data.gender !== currentGender) {
            updatedMetadata.gender = data.gender;
        }
        if (data.demographic && data.demographic !== currentDemographic) {
            updatedMetadata.demographic = data.demographic;
        }

        // If there are no changes, don't update
        if (Object.keys(updatedMetadata).length === 0) {
            // console.log("No changes detected");
            return;
        }

        try {
            await user?.update({
                unsafeMetadata: {
                    ...user.unsafeMetadata,
                    ...updatedMetadata, // Update only the changed fields
                },
            });
            // console.log("User updated successfully");
        } catch (error) {
            console.error("Error updating user:", error);
        }
    };

    return (
        <div className="p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <p className="mb-2">Gender</p>
                    <Select
                        onValueChange={(value) => setValue("gender", value)}
                        defaultValue={user?.unsafeMetadata?.gender as string}
                    >
                        <SelectTrigger className="w-full max-w-xs">
                            <SelectValue
                                placeholder={
                                    (user?.unsafeMetadata?.gender as string) ||
                                    "Select Gender"
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {genders.map((g) => (
                                <SelectItem key={g} value={g}>
                                    {g}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.gender && (
                        <span className="text-red-500 text-sm">
                            {errors.gender.message}
                        </span>
                    )}
                </div>

                <div>
                    <p className="mb-2">Demographic</p>
                    <Select
                        onValueChange={(value) =>
                            setValue("demographic", value)
                        }
                        defaultValue={
                            user?.unsafeMetadata?.demographic as string
                        }
                    >
                        <SelectTrigger className="w-full max-w-xs">
                            <SelectValue
                                placeholder={
                                    (user?.unsafeMetadata
                                        ?.demographic as string) ||
                                    "Select Demographic"
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {demographics.map((demographic) => (
                                <SelectItem
                                    key={demographic}
                                    value={demographic}
                                >
                                    {demographic}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.demographic && (
                        <span className="text-red-500 text-sm">
                            {errors.demographic.message}
                        </span>
                    )}
                </div>

                <Button type="submit">Submit</Button>
            </form>
        </div>
    );
}

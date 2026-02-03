import React from "react";
import { Mail } from "lucide-react";

export default function FundUsPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Support Afora</h1>
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Mail className="text-[#6F61EF]" />
                    <span className="text-lg font-bold">Contact Email: Afora.connect@gmail.com</span>
                </div>
                <div className="text-gray-600 space-y-4">
                    <p>Thank you for supporting the Afora project! Your donation will help us:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Maintain and improve platform features</li>
                        <li>Develop new features and tools</li>
                        <li>Provide better user support</li>
                        <li>Expand server resources</li>
                    </ul>
                    <p className="mt-6 text-sm italic">
                        We currently accept donations through email contact. In the future, we will add more payment methods such as Venmo and PayPal.
                    </p>
                </div>
            </div>
        </div>
    );
}

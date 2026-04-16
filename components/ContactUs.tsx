import Link from "next/link";
import React from "react";
import { Mail } from "lucide-react";
import { Button } from "./ui/button";

function ContactUs() {
  return (
    <Link href="/contact">
      <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20">
        <Mail className="w-6 h-6 mr-2" />
        Notifications
      </Button>
    </Link>
  );
}

export default ContactUs;

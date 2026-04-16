import React from "react";
import Link from "next/link";
import { Button } from "./ui/button";

function FundUs() {
  return (
    <Link href="/fund">
      <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20">
        Fund Us!
      </Button>
    </Link>
  );
}

export default FundUs;

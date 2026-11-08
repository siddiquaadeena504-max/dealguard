import { redirect } from "next/navigation";

// The landing page is built on Day 3; until then the root shows the design system.
export default function Home() {
  redirect("/style");
}

import { redirect } from "next/navigation";

// portal.brightlb.com has no public homepage (that is brightlb.com): go straight to the
// portal, which sends anyone not signed in to /login.
export default function Home() {
  redirect("/portal");
}

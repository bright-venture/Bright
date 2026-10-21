"use client";

import { useState } from "react";
import { Sprout, Users } from "lucide-react";
import { BrandsConsole } from "./brands-console";
import { AdminConsole } from "./admin-console";
import type { Brand } from "@/lib/portal/brand-types";
import type { Employee } from "@/lib/portal/admin-types";

type Tab = "brands" | "people";

// Admin-only. Splits the Administration section into switchable tabs so the
// panels don't stack: Brands, then People (invite + employee management).
export function AdministrationConsole({ brands, productCounts, employees, currentUserId }: { brands: Brand[]; productCounts: Record<string, number>; employees: Employee[]; currentUserId: string }) {
  const [tab, setTab] = useState<Tab>("brands");
  const tabs: { id: Tab; label: string; icon: typeof Sprout }[] = [
    { id: "brands", label: "Brands", icon: Sprout },
    { id: "people", label: "People", icon: Users },
  ];

  return <div className="admin-console">
    <div className="inv-tabs">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={16} /> {label}</button>)}
    </div>
    {tab === "brands" && <BrandsConsole brands={brands} productCounts={productCounts} />}
    {tab === "people" && <AdminConsole employees={employees} currentUserId={currentUserId} />}
  </div>;
}

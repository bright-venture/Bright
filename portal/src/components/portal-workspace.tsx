"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Boxes, Building2, ChartNoAxesCombined, FileText, LayoutDashboard, Menu, Package, Settings2, Sparkles, Warehouse, X } from "lucide-react";
import { Wordmark } from "./wordmark";
import { SignOutButton } from "./sign-out-button";
import { FolderBrowser } from "./folder-browser";
import { AdministrationConsole } from "./administration-console";
import { InventoryModule } from "./inventory-module";
import { ReportsList } from "./reports-list";
import { Select } from "./select";
import { type Folder, type FolderModule } from "@/lib/portal/folder-types";
import type { Employee, PortalRole } from "@/lib/portal/admin-types";
import type { Brand } from "@/lib/portal/brand-types";
import type { Inventory } from "@/lib/portal/inventory-types";
import type { Machine } from "@/lib/portal/machine-types";
import type { MaintenanceReport, ReportSnapshot } from "@/lib/portal/maintenance-templates";

const sections = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Inventory", icon: Boxes },
  { name: "Documents", icon: FileText },
  { name: "Reports", icon: ChartNoAxesCombined },
  { name: "Administration", icon: Settings2 },
] as const;
type Section = typeof sections[number]["name"];
const details: Record<Exclude<Section, "Overview">, { title: string; body: string }> = {
  Inventory: { title: "A clear view of every stock movement", body: "Products, batches, warehouse locations, receipts, and dispatches will live here. Inventory entry is the next stage of your portal." },
  Documents: { title: "Company documents, together", body: "Organize scanned documents and attach them to brands and inventory records. Private document uploads will be added in a later stage." },
  Reports: { title: "The picture behind your operations", body: "Stock balances, expiry dates, and movement history will become reports once inventory records are available." },
  Administration: { title: "One company. The right access.", body: "Employee access currently requires an account created by your administrator and an approved membership. In-app invitations and permission management are not available yet." },
};

export function PortalWorkspace({ brands, folders, role, currentUserId, employees, inventory, machines, reports, snapshots, initialSection }: { brands: Brand[]; folders: Folder[]; role: PortalRole; currentUserId: string; employees: Employee[]; inventory: Inventory; machines: Machine[]; reports: MaintenanceReport[]; snapshots: ReportSnapshot[]; initialSection?: string }) {
  // The section lives in the URL (?section=Reports) so Back from a report returns here.
  const [section, setSection] = useState<Section>(() => {
    const match = sections.find(item => item.name === initialSection);
    return match && (match.name !== "Administration" || role === "admin") ? match.name : "Overview";
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (section === "Overview") url.searchParams.delete("section"); else url.searchParams.set("section", section);
    window.history.replaceState(window.history.state, "", url);
  }, [section]);
  const [brandId, setBrandId] = useState("");
  // When the Reports "Versions" button opens a machine's Documents folder.
  const [targetFolder, setTargetFolder] = useState<string | null>(null);
  // Mobile only: the ☰ menu that replaces the horizontally scrolling section tabs.
  const [menuOpen, setMenuOpen] = useState(false);

  function openVersions(machine: Machine) {
    if (!machine.documentsFolderId) return;
    setBrandId(machine.brandId ?? "");
    setTargetFolder(machine.documentsFolderId);
    setSection("Documents");
  }
  const selectedBrand = brands.find(brand => brand.id === brandId);
  const visibleBrands = brands.filter(brand => !brandId || brand.id === brandId);
  const brandName = selectedBrand?.name ?? "All brands";
  const SectionIcon = sections.find(item => item.name === section)!.icon;
  // Documents uses folders; Reports lists maintenance reports; Inventory has its own module.
  const folderModule = section === "Documents" ? "documents" as FolderModule : null;
  // Staff never see the Administration section.
  const visibleSections = role === "admin" ? sections : sections.filter(item => item.name !== "Administration");
  // Product count per brand, so the Brands console can warn before a cascading delete.
  const productCounts = Object.fromEntries(brands.map(brand => [brand.id, inventory.products.filter(product => product.brandId === brand.id).length]));

  return <div className="portal-shell">
    <aside className={`sidebar${menuOpen ? " menu-open" : ""}`}>
      <div className="sidebar-top">
        <Wordmark asLink={false} />
        <button type="button" className="menu-toggle" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-controls="portal-nav" aria-label={menuOpen ? "Close menu" : "Open menu"}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}<span>Menu</span>
        </button>
      </div>
      <p className="sidebar-caption">EMPLOYEE PORTAL</p>
      <nav id="portal-nav" aria-label="Portal navigation">
        {visibleSections.map(({ name, icon: Icon }) => <button key={name} className={section === name ? "selected" : ""} aria-current={section === name ? "page" : undefined} onClick={() => { setSection(name); setMenuOpen(false); }}><Icon size={19} />{name}</button>)}
        {/* Mobile only: sign out lives in the menu (the header bar is hidden on phones). */}
        <div className="menu-signout"><SignOutButton /></div>
      </nav>
      <div className="sidebar-bottom"><span className="company-avatar">BS</span><div><strong>Bright Service Company SARL</strong><span>Lebanon</span></div></div>
    </aside>
    <div className="portal-workspace">
      <header className="portal-header"><span>Workspace <span className="breadcrumb">/ {section}</span></span><div className="portal-account"><SignOutButton /></div></header>
      <main className="portal-main">
        <div className="portal-heading">
          <div><p className="eyebrow">BRIGHT WORKSPACE</p><h1>{section}</h1><p>{section === "Overview" ? "Your brands and operations, in one place." : `Company-wide ${section.toLowerCase()}, organized around your team.`}</p></div>
          <div className="brand-select"><label htmlFor="brand-filter">Brand</label><Select id="brand-filter" ariaLabel="Filter by brand" className="ui-brand" value={brandId} onChange={setBrandId} options={[{ value: "", label: "All brands" }, ...brands.map(brand => ({ value: brand.id, label: brand.name }))]} /></div>
        </div>
        {section === "Reports" ? <ReportsList machines={machines} reports={reports} snapshots={snapshots} brandId={brandId} onOpenVersions={openVersions} /> : section === "Overview" ? <>
          <div className="metric-grid">
            {[
              { label: "Products", icon: Package, value: inventory.products.filter(product => !brandId || product.brandId === brandId).length, hint: "in catalog" },
              { label: "Stock locations", icon: Warehouse, value: inventory.locations.filter(location => !brandId || location.brandId === brandId).length, hint: "tracked" },
              { label: "Document folders", icon: FileText, value: folders.filter(folder => folder.module === "documents" && (!brandId || folder.brand_id === brandId)).length, hint: "organized" },
            ].map(({ label, icon: Icon, value, hint }) => <article className="metric" key={label}><div><span>{label}</span><Icon size={19} /></div><strong>{value}</strong><small>{value === 0 ? "None yet" : hint}</small></article>)}
          </div>
          <section className="portal-panel">
            <div className="panel-heading"><div><h2>{selectedBrand?.name ?? "Our brands"}</h2><p>Part of Bright Service Company SARL</p></div><span>{visibleBrands.length} {visibleBrands.length === 1 ? "brand" : "brands"}</span></div>
            <div className="portal-brand-list">
              {visibleBrands.length === 0 && <p className="portal-no-brands">No brands are available. Contact your administrator.</p>}
              {visibleBrands.map(brand => <div className="portal-brand-row" key={brand.id}>
                <span className="brand-avatar green"><Building2 size={23} /></span>
                <div><h3>{brand.name}</h3><p>Brand</p></div>
                <button onClick={() => { setBrandId(brand.id); setSection("Inventory"); }} aria-label={`View ${brand.name} inventory`}>View inventory <ArrowUpRight size={16} /></button>
              </div>)}
            </div>
          </section>
          <section className="portal-panel getting-started"><div><p className="eyebrow">YOUR WORKSPACE</p><h2>Welcome to your workspace.</h2><p>Your employee account is connected. Next, we will set up products, locations, and opening stock for your brands.</p></div><span className="foundation-icon"><Sparkles size={44} strokeWidth={1.2} /></span></section>
        </> : section === "Inventory" ? <InventoryModule inventory={inventory} brands={brands} brandId={brandId} machines={machines} isAdmin={role === "admin"} /> : folderModule
          ? <FolderBrowser key={folderModule + brandId + (targetFolder ?? "")} module={folderModule} folders={folders.filter(folder => folder.module === folderModule && (!brandId || folder.brand_id === brandId))} brandId={brandId} machines={machines} snapshots={snapshots} isAdmin={role === "admin"} initialFolderId={targetFolder} />
          : section === "Administration" && role === "admin" ? <AdministrationConsole brands={brands} productCounts={productCounts} employees={employees} currentUserId={currentUserId} /> : <section className="portal-panel empty-state"><span className="empty-icon"><SectionIcon size={31} strokeWidth={1.4} /></span><p className="eyebrow">{brandName.toUpperCase()}</p><h2>{details[section].title}</h2><p>{details[section].body}</p><span className="coming-label">Not available yet</span></section>}
      </main>
    </div>
  </div>;
}

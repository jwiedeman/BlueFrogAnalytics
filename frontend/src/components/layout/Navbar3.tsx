"use client";

import {
  ArrowUpRight,
  BarChart,
  Bitcoin,
  Building,
  Building2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Search,
  Gauge,
  Megaphone,
  Book,
  ShieldCheck,
  Accessibility,
  Cpu,
  Film,
  Fingerprint,
  GraduationCap,
  HeartPulse,
  Leaf,
  Lock,
  Globe,
  Beer,
  Wrench,
  Utensils,
  Truck,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/firebase";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const solutions = [
  {
    title: "Influence Playbook",
    description: "Proven persuasion tactics for modern brands",
    href: "/services/consulting",
    icon: Book,
  },
  {
    title: "PR Consulting",
    description: "Strategy sessions to shape public opinion",
    href: "/services/consulting",
    icon: Megaphone,
  },
  {
    title: "Campaign Services",
    description: "Full-service influence campaigns",
    href: "/services/marketing",
    icon: Gauge,
  },
  {
    title: "Influence Dashboard",
    description: "Track sentiment and outreach in one place",
    href: "/dashboard",
    icon: BarChart,
  },
];



const industries = [
  {
    title: "Bar",
    href: "/industry/bar",
    icon: Beer,
  },
  {
    title: "Services",
    href: "/industry/services",
    icon: Wrench,
  },
  {
    title: "Restaurant",
    href: "/industry/restaurant",
    icon: Utensils,
  },
  {
    title: "Food Truck",
    href: "/industry/food-truck",
    icon: Truck,
  },
];

const documentationLinks = [
  {
    title: "High Level Flow",
    href: "/docs/introduction/how-blue-frog-analytics-works/",
  },
  {
    title: "Web Platforms",
    href: "/docs/website-platforms/cms/wordpress/",
  },
  {
    title: "Analytics Platforms",
    href: "/docs/analytics-platforms/google-analytics/",
  },
  {
    title: "Ad Platforms",
    href: "/docs/ad-platforms/google-ads/",
  },
];

const resources = [
  {
    title: "Influence Playbook",
    description: "Download our guide to modern persuasion",
    href: "/services/consulting",
  },
  {
    title: "Documentation",
    description: "In sapien tellus, sodales in pharetra a, mattis ac turpis.",
    href: "/docs",
  },
  {
    title: "Free Testing Tools",
    description: "Vivamus ut risus accumsan, tempus sapien eget.",
    href: "/testing",
  },
  {
    title: "News & Blog",
    description: "Maecenas eget orci ac nulla tempor tincidunt.",
    href: "/blog",
  },
];

const Navbar3 = () => {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<
    "offerings" | "industries" | "documentation" | "resources" | null
  >(null);
  const [showDebug, setShowDebug] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowDebug(window.location.search.includes('debug=true'));
    const w = window as any;
    const update = (user?: any) => setLoggedIn(!!user);
    let unsub: any;
    if (w.onAuthStateChanged && w.firebaseAuth) {
      update(w.firebaseAuth.currentUser);
      unsub = w.onAuthStateChanged(w.firebaseAuth, update);
    } else {
      update(localStorage.getItem('bfaLoggedIn') === 'true');
    }
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (
        mobileProfileRef.current &&
        !mobileProfileRef.current.contains(e.target as Node)
      ) {
        setMobileProfileOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
  return (
    <section className="inset-x-0 top-0 z-20 bg-background">
      <div className="container">
        <NavigationMenu className="min-w-full">
          <div className="flex w-full items-center justify-between gap-12 py-4">
            {/* Logo */}
            <div>
              {(!open || !submenu) && (
                <>
                  <a
                    href="/"
                    className="hidden items-center gap-2 lg:flex"
                  >
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblockscom-icon.svg"
                      className="max-h-8"
                      alt="Shadcn UI Navbar"
                      loading="lazy"
                    />
                    <span className="text-lg font-semibold tracking-tighter">
                      <span className="bluefrog-brand">BlueFrog</span>Analytics
                    </span>
                  </a>
                  <a
                    href="/"
                    className="flex items-center gap-2 lg:hidden"
                  >
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblockscom-icon.svg"
                      className="max-h-8"
                      alt="Shadcn UI Navbar"
                      loading="lazy"
                    />
                  </a>
                </>
              )}
              {open && submenu && (
                <Button variant="outline" onClick={() => setSubmenu(null)}>
                  Back
                  <ChevronLeft className="ml-2 size-4" />
                </Button>
              )}
            </div>

            <NavigationMenuList className="hidden lg:flex">
              <NavigationMenuItem>
                <NavigationMenuTrigger>Offerings</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[calc(100vw-4rem)] p-8 lg:p-12 2xl:min-w-[calc(1400px-4rem)]">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {solutions.map((solution, index) => (
                      <NavigationMenuLink
                        key={index}
                        href={solution.href}
                        className="group flex flex-col gap-2 p-4"
                      >
                        <solution.icon className="size-5 text-primary" strokeWidth={1.5} />
                        <div className="text-base font-medium">{solution.title}</div>
                        <div className="text-sm text-muted-foreground">{solution.description}</div>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Documentation</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[calc(100vw-4rem)] p-8 lg:p-12 2xl:min-w-[calc(1400px-4rem)]">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {documentationLinks.map((link, index) => (
                      <NavigationMenuLink
                        key={index}
                        href={link.href}
                        className="group flex items-center gap-2 rounded-md p-4 hover:bg-accent"
                      >
                        <ArrowUpRight className="size-4" />
                        <span className="text-base font-medium">{link.title}</span>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Industries</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[calc(100vw-4rem)] p-8 lg:p-12 2xl:min-w-[calc(1400px-4rem)]">
                  <div className="flex justify-between gap-8 lg:gap-x-[52px]">
                    <div className="w-1/2 max-w-[510px]">
                      <div className="mb-6 text-xs tracking-widest text-muted-foreground uppercase">
                        Industries
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        {industries.map((industry, index) => (
                          <NavigationMenuLink
                            key={index}
                            href={industry.href}
                            className="group flex flex-row items-center gap-5"
                          >
                            <div className="group-hover:opacity-60">
                              <industry.icon className="size-4 text-black" strokeWidth={1} />
                            </div>
                            <div className="text-base">{industry.title}</div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                    <NavigationMenuLink
                      href="/services"
                      className="flex flex-col gap-2 rounded-lg border border-input bg-background p-5 hover:bg-accent xl:p-8"
                    >
                      <div className="text-base font-medium">Full-service consulting</div>
                      <div className="text-sm text-muted-foreground">
                        Comprehensive reviews to boost growth.
                      </div>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[calc(100vw-4rem)] p-8 lg:p-12 2xl:min-w-[calc(1400px-4rem)]">
                  <div className="flex gap-8 lg:gap-12">
                    <div className="flex flex-1 flex-col">
                      <div className="mb-6 text-xs tracking-widest text-muted-foreground uppercase">
                        Resources
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {resources.map((resource, index) => (
                          <NavigationMenuLink
                            key={index}
                            href={resource.href}
                            className="flex h-full flex-col overflow-clip rounded-lg border border-input bg-background p-5 hover:bg-accent hover:text-accent-foreground xl:p-8"
                          >
                            <div className="mt-auto">
                              <div className="mb-2 text-base">
                                {resource.title}
                              </div>
                              <div className="text-sm font-normal text-muted-foreground">
                                {resource.description}
                              </div>
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                    <div className="w-1/3 max-w-[404px]">
                      <div className="mb-6 text-xs tracking-widest text-muted-foreground uppercase">
                        Case Studies
                      </div>
                      <NavigationMenuLink
                        href="/case-studies"
                        className="flex flex-col gap-2 rounded-lg border border-input bg-background p-5 hover:bg-accent xl:p-8"
                      >
                        <div className="text-base font-medium">Case Studies</div>
                        <div className="text-sm text-muted-foreground">Real-world success stories</div>
                      </NavigationMenuLink>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              {showDebug && (
                <NavigationMenuItem>
                  <NavigationMenuLink href="/debug-links" className="p-2">
                    Debug Links
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
              <div className="hidden items-center gap-2 lg:flex relative">
              {!loggedIn && (
                <Button asChild variant="ghost">
                  <a href="/login">Login</a>
                </Button>
              )}
              {!loggedIn && (
                <Button asChild variant="outline">
                  <a href="/contact">
                    Start now
                    <ChevronRight className="size-4" />
                  </a>
                </Button>
              )}
              {loggedIn && (
                <Button asChild variant="ghost">
                  <a href="/dashboard">Dashboard</a>
                </Button>
              )}
              {loggedIn && (
                <div className="relative" ref={profileRef}>
                  <Button
                    variant="outline"
                    onClick={() => setProfileOpen(!profileOpen)}
                  >
                    Profile
                    <ChevronRight className="size-4" />
                  </Button>
                  {profileOpen && (
                    <ul className="absolute right-0 mt-2 w-40 rounded border bg-background shadow">
                      <li>
                        <a href="/dashboard/profile" className="block px-4 py-2 hover:bg-muted">
                          Profile
                        </a>
                      </li>
                      <li>
                        <a href="/dashboard/billing" className="block px-4 py-2 hover:bg-muted">
                          Billing
                        </a>
                      </li>
                      <li>
                        <a href="/dashboard/settings" className="block px-4 py-2 hover:bg-muted">
                          Settings
                        </a>
                      </li>
                      <li className="border-t my-1" />
                      <li>
                        <a
                          href="#"
                          onClick={async e => {
                            e.preventDefault();
                            await logout();
                            window.location.href = '/';
                          }}
                          className="block px-4 py-2 hover:bg-muted"
                        >
                          Logout
                        </a>
                      </li>
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 lg:hidden">
              <Button
                variant="outline"
                size="icon"
                aria-label="Main Menu"
                onClick={() => {
                  if (open) {
                    setOpen(false);
                    setSubmenu(null);
                  } else {
                    setOpen(true);
                  }
                }}
              >
                {!open && <Menu className="size-4" />}
                {open && <X className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu (Root) */}
          {open && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll border-t border-border bg-background lg:hidden">
              <div>
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("offerings")}
                >
                  <span className="flex-1">Offerings</span>
                  <span className="shrink-0">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("documentation")}
                >
                  <span className="flex-1">Documentation</span>
                <span className="shrink-0">
                  <ChevronRight className="size-4" />
                </span>
              </button>
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("industries")}
                >
                  <span className="flex-1">Industries</span>
                  <span className="shrink-0">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center border-b border-border px-8 py-7 text-left"
                  onClick={() => setSubmenu("resources")}
                >
                  <span className="flex-1">Resources</span>
                  <span className="shrink-0">
                    <ChevronRight className="size-4" />
                  </span>
                </button>
                {showDebug && (
                  <a
                    href="/debug-links"
                    className="flex w-full items-center border-b border-border px-8 py-7"
                  >
                    Debug Links
                  </a>
                )}
              </div>
              <div className="mx-[2rem] mt-auto flex flex-col gap-4 py-12">
                {!loggedIn && (
                  <>
                    <Button asChild variant="outline" className="relative" size="lg">
                      <a href="/login">Login</a>
                    </Button>
                    <Button asChild className="relative" size="lg">
                      <a href="/contact">Start now</a>
                    </Button>
                  </>
                )}
                {loggedIn && (
                  <>
                    <Button asChild variant="outline" className="relative" size="lg">
                      <a href="/dashboard">Dashboard</a>
                    </Button>
                    <div className="relative" ref={mobileProfileRef}>
                      <Button
                        className="relative"
                        size="lg"
                        onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
                      >
                        Profile
                      <ChevronRight className="ml-2 size-4" />
                    </Button>
                    {mobileProfileOpen && (
                      <ul className="absolute right-0 mt-2 w-40 rounded border bg-background shadow">
                        <li>
                          <a href="/dashboard/profile" className="block px-4 py-2 hover:bg-muted">
                            Profile
                          </a>
                        </li>
                        <li>
                          <a href="/dashboard/billing" className="block px-4 py-2 hover:bg-muted">
                            Billing
                          </a>
                        </li>
                        <li>
                          <a href="/dashboard/settings" className="block px-4 py-2 hover:bg-muted">
                            Settings
                          </a>
                        </li>
                        <li className="border-t my-1" />
                        <li>
                          <a
                            href="#"
                            onClick={async e => {
                              e.preventDefault();
                              await logout();
                              window.location.href = '/';
                            }}
                            className="block px-4 py-2 hover:bg-muted"
                          >
                            Logout
                          </a>
                        </li>
                      </ul>
                    )}
                  </div>
                    </>
                )}
              </div>
            </div>
          )}
          {/* Mobile Menu > Offerings */}
          {open && submenu === "offerings" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll border-t border-border bg-background lg:hidden">
              <div className="py-4" />
              <div className="border-t border-border pb-16">
                {solutions.map((solution, index) => (
                  <a
                    key={index}
                    href={solution.href}
                    className="group flex w-full items-start gap-x-4 border-b border-border px-8 py-7 text-left hover:bg-accent"
                  >
                    <div className="shrink-0">
                      <solution.icon className="size-6" />
                    </div>
                    <div>
                      <div className="mb-1.5 text-base">{solution.title}</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        {solution.description}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Mobile Menu > Industries */}
          {open && submenu === "industries" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll bg-background lg:hidden">
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Industries
              </div>
              <div>
                {industries.map((industry, index) => (
                  <a
                    key={index}
                    href={industry.href}
                    className="group flex w-full items-start gap-x-4 border-t border-border px-8 py-7 text-left hover:bg-accent"
                  >
                    <div className="shrink-0">
                      <industry.icon className="size-6" />
                    </div>
                    <div className="text-base">{industry.title}</div>
                  </a>
                ))}
              </div>
              <div className="bg-secondary/30 px-8 pt-8 pb-16">
                <div className="mb-7 text-xs tracking-widest text-muted-foreground uppercase">
                  Full-service consulting
                </div>
                <a href="/services" className="block space-y-6">
                  <div className="overflow-clip rounded-lg">
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                      alt="Placeholder image" loading="lazy"
                      className="aspect-2/1 h-full w-full object-cover object-center"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-base">Elevate your entire operation</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      We review every aspect of your business to help you grow.
                    </div>
                  </div>
                </a>
              </div>
            </div>
          )}
          {/* Mobile Menu > Documentation */}
          {open && submenu === "documentation" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll border-t border-border bg-background lg:hidden">
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Documentation
              </div>
              <div className="-mx-2.5 space-y-2.5 px-8 pb-16">
                {documentationLinks.map((link, index) => (
                  <NavigationMenuLink
                    key={index}
                    href={link.href}
                    className="group flex flex-row items-center gap-2.5 rounded-md px-2.5 py-[18px] hover:bg-accent"
                  >
                    <div className="flex size-5 items-center justify-center rounded">
                      <ArrowUpRight className="size-3" />
                    </div>
                    <div className="text-sm">{link.title}</div>
                  </NavigationMenuLink>
                ))}
              </div>
            </div>
          )}
          {/* Mobile Menu > Resources */}
          {open && submenu === "resources" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll bg-background lg:hidden">
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Resources
              </div>
              <div>
                {resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.href}
                    className="group flex w-full items-start gap-x-4 border-t border-border px-8 py-7 text-left hover:bg-accent"
                  >
                    <div>
                      <div className="mb-1.5 text-base">{resource.title}</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        {resource.description}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="px-8 pt-8 pb-16">
                <div className="mb-7 text-xs tracking-widest text-muted-foreground uppercase">
                  Case Studies
                </div>
                <a href="/case-studies" className="block space-y-2">
                  <div className="text-base font-medium">Case Studies</div>
                  <div className="text-sm text-muted-foreground">Real-world success stories</div>
                </a>
              </div>
            </div>
          )}
        </NavigationMenu>
      </div>
    </section>
  );
};

export { Navbar3 };

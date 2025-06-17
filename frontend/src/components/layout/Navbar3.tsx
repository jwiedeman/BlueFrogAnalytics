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
    title: "SEO",
    description: "Optimize search visibility and rankings",
    href: "/services/seo",
    icon: Search,
  },
  {
    title: "Performance",
    description: "Improve speed and Core Web Vitals",
    href: "/services/performance",
    icon: Gauge,
  },
  {
    title: "Marketing",
    description: "Engage visitors with targeted campaigns",
    href: "/services/marketing",
    icon: Megaphone,
  },
  {
    title: "Consulting",
    description: "Get expert guidance on analytics strategy",
    href: "/services/consulting",
    icon: Book,
  },
  {
    title: "Compliance",
    description: "Stay ahead of privacy regulations",
    href: "/services/compliance",
    icon: ShieldCheck,
  },
  {
    title: "Accessibility",
    description: "Ensure an inclusive experience",
    href: "/services/accessibility",
    icon: Accessibility,
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
    "platform" | "industries" | "documentation" | "resources" | null
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
                <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[calc(100vw-4rem)] p-8 lg:p-12 2xl:min-w-[calc(1400px-4rem)]">
                  <div className="flex items-start justify-between gap-8 lg:gap-x-12">
                    <NavigationMenuLink
                      href="/services"
                      className="group w-1/3 max-w-[398px] p-0 hover:bg-transparent"
                    >
                      <div className="overflow-clip rounded-lg border border-input bg-background">
                        <div>
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image" loading="lazy"
                            className="h-[190px] w-[398px] object-cover object-center"
                          />
                        </div>
                        <div className="p-5 xl:p-8">
                          <div className="mb-2 text-base">
                            Platform Overview
                          </div>
                          <div className="text-sm font-normal text-muted-foreground">
                            Pellentesque nec odio id elit dapibus rutrum.
                          </div>
                        </div>
                      </div>
                    </NavigationMenuLink>
                    <div className="max-w-[760px] flex-1">
                      <div className="mb-6 text-xs tracking-widest text-muted-foreground uppercase">
                        Solutions
                      </div>
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                        {solutions.map((solution, index) => (
                          <NavigationMenuLink
                            key={index}
                            href={solution.href}
                            className="group block p-4"
                          >
                            <div className="mb-5 group-hover:opacity-60">
                              <solution.icon
                                className="size-5 text-black"
                                strokeWidth={1.5}
                              />
                            </div>
                            <div className="mb-1 text-base">
                              {solution.title}
                            </div>
                            <div className="text-sm font-normal text-muted-foreground">
                              {solution.description}
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Documentation</NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-[calc(100vw-4rem)] p-8 lg:p-12 2xl:min-w-[calc(1400px-4rem)]">
                  <div className="flex justify-between gap-8 lg:gap-x-12">
                    <div className="w-1/3 max-w-[404px]">
                      <div className="mb-4 text-xs tracking-widest text-muted-foreground uppercase">
                        Documentation
                      </div>
                      <div className="mb-6 text-sm font-normal text-muted-foreground">
                        Call to action for developers
                      </div>
                      <div className="-ml-2.5 space-y-2.5">
                        {documentationLinks.map((documentationLink, index) => (
                          <NavigationMenuLink
                            key={index}
                            href={documentationLink.href}
                            className="group flex flex-row items-center gap-2.5 rounded-md p-2.5 focus:text-accent-foreground"
                          >
                            <ArrowUpRight className="size-4" />
                            <div className="text-base">
                              {documentationLink.title}
                            </div>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                    <div className="max-w-[716px] flex-1 space-y-6">
                      <NavigationMenuLink
                        href="/docs"
                        className="flex flex-row items-center overflow-clip rounded-lg border border-input bg-background p-0 hover:bg-transparent"
                      >
                        <div className="flex-1 p-5 xl:p-8">
                          <div className="mb-2 text-base">Showcase link</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            Fusce neque dolor, sollicitudin sed sodales non,
                            condimentum vel metus.
                          </div>
                        </div>
                        <div className="h-[154px] max-w-[264px] shrink-0">
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image" loading="lazy"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                      </NavigationMenuLink>
                      <NavigationMenuLink
                        href="/blog"
                        className="flex flex-row items-center overflow-clip rounded-lg border border-input bg-background p-0 hover:bg-transparent"
                      >
                        <div className="flex-1 p-5 xl:p-8">
                          <div className="mb-2 text-base">
                            Another showcase link
                          </div>
                          <div className="text-sm font-normal text-muted-foreground">
                            Duis metus mauris, efficitur imperdiet magna vitae,
                            accumsan mattis lacus.
                          </div>
                        </div>
                        <div className="h-[154px] max-w-[264px] shrink-0">
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image" loading="lazy"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                      </NavigationMenuLink>
                    </div>
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
                      className="group max-w-[604px] flex-1 p-0 hover:bg-transparent"
                    >
                      <div className="flex h-full rounded-lg border border-input bg-background p-0 hover:bg-transparent">
                        <div className="w-2/5 max-w-[310px] shrink-0 overflow-clip rounded-tl-lg rounded-bl-lg">
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image" loading="lazy"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                        <div className="flex flex-col p-5 xl:p-8">
                          <div className="mb-8 text-xs tracking-widest text-muted-foreground uppercase">
                            Full-service consulting
                          </div>
                          <div className="mt-auto">
                            <div className="mb-4 text-xl">Elevate your entire operation</div>
                            <div className="text-sm font-normal text-muted-foreground">
                              We review every aspect of your business to help you grow.
                            </div>
                          </div>
                        </div>
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
                        className="mb-6 flex flex-row overflow-clip rounded-lg border border-input bg-background p-0 hover:bg-transparent"
                      >
                        <div className="flex-1 p-5 xl:p-8">
                          <div className="mb-2 text-base">Case Studies</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            Integer a ipsum quis nisi posuere lobortis at id
                            tellus.
                          </div>
                        </div>
                        <div className="w-1/3 max-w-[130px] shrink-0">
                          <img
                            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                            alt="Placeholder image" loading="lazy"
                            className="h-full w-full object-cover object-center"
                          />
                        </div>
                      </NavigationMenuLink>
                      <NavigationMenuLink
                        href="/case-studies"
                        className="flex flex-row items-center gap-3 rounded-lg bg-secondary/30 p-3 hover:bg-secondary/80 focus:bg-secondary/80"
                      >
                        <Badge variant="secondary">NEW</Badge>
                        <span className="text-sm text-ellipsis text-secondary-foreground">
                          Proin volutpat at felis in vehicula
                        </span>
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
                  onClick={() => setSubmenu("platform")}
                >
                  <span className="flex-1">Platform</span>
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
                )}
              </div>
            </div>
          )}
          {/* Mobile Menu > Platform */}
          {open && submenu === "platform" && (
            <div className="fixed inset-0 top-[72px] flex h-[calc(100vh-72px)] w-full flex-col overflow-scroll border-t border-border bg-background lg:hidden">
              <a href="/services" className="block space-y-6 px-8 py-8">
                <div className="w-full overflow-clip rounded-lg">
                  <img
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                    alt="Placeholder image" loading="lazy"
                    className="aspect-2/1 h-full w-full object-cover object-center"
                  />
                </div>
                <div>
                  <div className="mb-2 text-base">Platform Overview</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Pellentesque nec odio id elit dapibus rutrum.
                  </div>
                </div>
              </a>
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Solutions
              </div>
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
              <a href="/docs" className="block space-y-6 px-8 py-8">
                <div className="w-full overflow-clip rounded-lg">
                  <img
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                    alt="Placeholder image" loading="lazy"
                    className="aspect-2/1 h-full w-full object-cover object-center"
                  />
                </div>
                <div>
                  <div className="mb-2 text-base">Start with our API</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Head to our developer documentation for all the help you
                    need to embed our payments API.
                  </div>
                </div>
              </a>
              <a
                href="/blog"
                className="block space-y-6 border-t border-border px-8 py-8"
              >
                <div className="w-full overflow-clip rounded-lg">
                  <img
                    src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                    alt="Placeholder image" loading="lazy"
                    className="aspect-2/1 h-full w-full object-cover object-center"
                  />
                </div>
                <div>
                  <div className="mb-2 text-base">Quick Start</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    Check out our quick-start guides, where you'll find
                    tips and tricks for everything payments.
                  </div>
                </div>
              </a>
              <div className="px-8 py-3.5 text-xs tracking-widest text-muted-foreground uppercase">
                Documentation
              </div>
              <div className="-mx-2.5 space-y-2.5 px-8 pb-16">
                {documentationLinks.map((documentationLink, index) => (
                  <NavigationMenuLink
                    key={index}
                    href={documentationLink.href}
                    className="group py-[18px]focus:text-accent-foreground flex flex-row items-center gap-2.5 rounded-md px-2.5"
                  >
                    <div className="flex size-5 items-center justify-center rounded">
                      <ArrowUpRight className="size-3" />
                    </div>
                    <div className="text-sm">{documentationLink.title}</div>
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
                <a href="/case-studies" className="block space-y-6">
                  <div className="overflow-clip rounded-lg">
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                      alt="Placeholder image" loading="lazy"
                      className="aspect-2/1 h-full w-full object-cover object-center"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 text-base">Case Studies</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      Meet the product teams changing how they process payments.
                    </div>
                  </div>
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

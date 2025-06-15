"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Section {
  id: string;
  heading: string;
  content: ReactNode;
}

interface PageWithSidebarProps {
  title: string;
  description?: string;
  sections: Section[];
}

const PageWithSidebar = ({ title, description, sections }: PageWithSidebarProps) => {
  const [activeHeadings, setActiveHeadings] = useState<string[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    const keys = Object.keys(sectionRefs.current);

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          setActiveHeadings((prev) => (prev.includes(id) ? prev : [...prev, id]));
        } else {
          setActiveHeadings((prev) => prev.filter((h) => h !== id));
        }
      });
    };

    let observer: IntersectionObserver | null = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "0px",
      threshold: 1,
    });

    keys.forEach((id) => {
      const el = sectionRefs.current[id];
      if (el) observer?.observe(el);
    });

    return () => {
      observer?.disconnect();
      observer = null;
    };
  }, []);

  const addSectionRef = (id: string, ref: HTMLElement | null) => {
    if (ref) sectionRefs.current[id] = ref;
  };

  return (
    <section className="py-32">
      <div className="container">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="mt-10 text-balance text-4xl font-bold md:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-2xl text-balance text-xl font-medium">{description}</p>
        )}
        <div className="relative mt-16 grid gap-10 lg:mt-28 lg:grid-cols-5">
          <div className="gap-6 lg:col-span-3">
            <div className="max-w-prose lg:mx-auto">
              <div className="prose dark:prose-invert prose-h3:mt-14 prose-h3:scroll-mt-14 prose-h3:text-lg mt-12">
                {sections.map((section) => (
                  <div key={section.id}>
                    <h3
                      id={section.id}
                      ref={(ref) => addSectionRef(section.id, ref)}
                      className="text-2xl font-semibold"
                    >
                      {section.heading}
                    </h3>
                    {section.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <nav className="sticky top-10 hidden h-fit lg:block">
            <p className="text-muted-foreground text-sm">ON THIS PAGE</p>
            <ul className="text-muted-foreground mt-1.5 text-xs">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    className={cn(
                      "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                      activeHeadings.includes(section.id)
                        ? "border-primary text-primary font-medium"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    href={`#${section.id}`}
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
};

export { PageWithSidebar };

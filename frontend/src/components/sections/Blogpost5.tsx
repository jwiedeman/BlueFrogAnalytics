"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

interface BlogpostProps {
  title?: string;
  date?: string | Date;
  description?: string;
  children: React.ReactNode;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const Blogpost5 = ({ title, date, description, children }: BlogpostProps) => {
  const [activeHeadings, setActiveHeadings] = useState<string[]>([]);
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement>>({});
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const articleEl = articleRef.current;
    if (!articleEl) return;

    const hs = Array.from(articleEl.querySelectorAll("h3"));
    const newHeadings: { id: string; text: string }[] = [];
    sectionRefs.current = {};
    hs.forEach((el) => {
      let id = el.id;
      if (!id) {
        id = slugify(el.textContent || "");
        el.id = id;
      }
      newHeadings.push({ id, text: el.textContent || "" });
      sectionRefs.current[id] = el as HTMLElement;
    });
    setHeadings(newHeadings);

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const id = entry.target.id;

        if (entry.isIntersecting) {
          setActiveHeadings((prev) =>
            prev.includes(id) ? prev : [...prev, id],
          );
        } else {
          setActiveHeadings((prev) => prev.filter((h) => h !== id));
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "0px",
      threshold: 1,
    });

    newHeadings.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [children]);

  const formattedDate = date
    ? new Date(date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <section className="py-32">
      <div className="container">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Blog</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{title || "Urban Gardening"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="mt-10 text-balance text-4xl font-bold md:text-5xl lg:text-6xl">
          {title || "Mastering sustainable urban gardening in small spaces."}
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-xl font-medium">
          {description ||
            "Transform your apartment balcony or tiny yard into a thriving green oasis with our proven techniques."}
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg">Get Started</Button>
          <Button variant="outline" size="lg">
            Gardening Guide
          </Button>
        </div>
        <div className="relative mt-16 grid gap-10 lg:mt-28 lg:grid-cols-5">
          <aside className="top-10 flex h-fit w-full max-w-56 flex-col gap-5 lg:sticky">
            <div>
              <h2 className="font-semibold">Topics</h2>
              <ul className="mt-2 flex flex-col gap-2">
                <li>
                  <p className="text-muted-foreground text-sm">Container Gardens</p>
                </li>
                <li>
                  <p className="text-muted-foreground text-sm">Vertical Systems</p>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="font-semibold">Last Updated</h2>
              <time className="text-muted-foreground text-sm">
                {formattedDate || "April 15, 2024"}
              </time>
            </div>
          </aside>
          <div className="gap-6 lg:col-span-3">
            <div className="max-w-prose lg:mx-auto">
              <img
                src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
                alt="placeholder"
                className="border-border aspect-video rounded-2xl border object-cover"
              />
              <div
                ref={articleRef}
                className="prose dark:prose-invert prose-h3:mt-14 prose-h3:scroll-mt-14 prose-h3:text-lg mt-12"
              >
                {children}
              </div>
            </div>
          </div>
          {headings.length > 0 && (
            <nav className="sticky top-10 hidden h-fit lg:block">
              <p className="text-muted-foreground text-sm">ON THIS PAGE</p>
              <ul className="text-muted-foreground mt-1.5 text-xs">
                {headings.map((h) => (
                  <li key={h.id}>
                    <a
                      className={cn(
                        "border-border block border-l py-1 pl-2.5 transition-colors duration-200",
                        activeHeadings.includes(h.id)
                          ? "border-primary text-primary font-medium"
                          : "text-muted-foreground hover:text-primary",
                      )}
                      href={`#${h.id}`}
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
};

export { Blogpost5 };

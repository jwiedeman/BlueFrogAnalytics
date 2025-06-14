import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type TimelineEntry = {
  date: string;
  items: {
    content: string;
    highlights?: { text: string; position: number }[];
  }[];
};

const timelineData: TimelineEntry[] = [
  {
    date: "July 1, 2025",
    items: [
      {
        content: "<strong>Public launch</strong> of our automation bots suite.",
      },
      {
        content: "Ongoing monitoring and feedback collection for improvements.",
      },
    ],
  },
  {
    date: "June 15, 2025",
    items: [
      {
        content: "Finalized features and completed testing on our initial bots.",
      },
      {
        content: "Prepared infrastructure for scale ahead of launch.",
      },
    ],
  },
  {
    date: "May 5, 2025",
    items: [
      {
        content: "Expanded early bot prototypes and integrated core systems.",
      },
      {
        content: "Internal testing underway with incremental refinements.",
      },
    ],
  },
  {
    date: "April 2, 2025",
    items: [
      {
        content: "Kicked off development of our first bots to automate workflows.",
      },
      {
        content: "Set up foundational infrastructure for asynchronous processing.",
      },
    ],
  },
  {
    date: "March 21, 2025",
    items: [
      {
        content:
          "Launched <strong>AI-powered code generation</strong> in our IDE, allowing developers to generate boilerplate code with natural language prompts.",
      },
      {
        content:
          "Introduced <em>contextual code suggestions</em> that understand project structure and coding patterns for more accurate completions.",
      },
      {
        content:
          "Added <u>automated code refactoring</u> capabilities that suggest and apply improvements to existing codebases.",
      },
    ],
  },
  {
    date: "March 19, 2025",
    items: [
      {
        content:
          "Released <strong>AI-driven debugging assistant</strong> that identifies potential issues and suggests fixes before runtime.",
      },
      {
        content:
          "Implemented <em>smart documentation generation</em> that automatically creates comprehensive docs from code comments and structure.",
      },
      {
        content:
          "Enhanced <u>code review automation</u> with AI-powered analysis of code quality and best practices.",
      },
    ],
  },
  {
    date: "March 17, 2025",
    items: [
      {
        content:
          "Announced <strong>AI pair programming</strong> feature that provides real-time coding assistance and explanations.",
      },
      {
        content:
          "Launched <em>intelligent dependency management</em> that suggests optimal package versions and identifies potential conflicts.",
      },
      {
        content:
          "Introduced <u>automated test generation</u> that creates comprehensive test suites based on code functionality.",
      },
    ],
  },
];

const Timeline8 = () => {
  return (
    <section className="bg-background py-32">
      <div className="container">
        <h1 className="mb-10 text-center text-3xl font-bold tracking-tighter text-foreground lg:text-6xl">
          Timeline
        </h1>
        <div className="relative mx-auto max-w-4xl">
          <Separator
            orientation="vertical"
            className="absolute top-4 left-2 bg-muted"
          />
          {timelineData.map((entry, index) => (
            <div key={index} className="relative mb-10 pl-8">
              <div className="absolute top-2 left-0 flex size-5 items-center justify-center rounded-full bg-foreground">
                <div className="size-3 rounded-full bg-white" />
              </div>
              <Badge
                variant="secondary"
                className="mb-4 rounded-xl px-3 py-2 text-sm"
              >
                {entry.date}
              </Badge>

              <Card className="my-5 border-none shadow-none">
                <CardContent className="px-2">
                  <ul className="flex flex-col gap-1">
                    {entry.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 flex-none rounded-full bg-foreground" />
                        <span
                          className="text-md leading-relaxed text-foreground"
                          dangerouslySetInnerHTML={{ __html: item.content }}
                        />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Timeline8 };

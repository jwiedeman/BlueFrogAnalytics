import { BookOpen, Briefcase, LayoutDashboard, Megaphone } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Bernays Playbook",
    description: "Step-by-step persuasion guide for your team.",
    href: "/bernays-playbook",
  },
  {
    icon: Briefcase,
    title: "PR Consulting",
    description: "Hands-on guidance to craft your narrative.",
    href: "/services/consulting",
  },
  {
    icon: Megaphone,
    title: "Campaign Services",
    description: "Influence campaigns executed across media.",
    href: "/services/marketing",
  },
  {
    icon: LayoutDashboard,
    title: "Influence Dashboard",
    description: "Monitor sentiment and outreach in one place.",
    href: "/dashboard",
  },
];

const HomeFeatures = () => {
  return (
    <section className="py-20">
      <div className="container">
        <h2 className="mb-10 text-center text-3xl font-semibold md:text-4xl">
          Bernays-Inspired Offerings
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, href }) => (
            <a
              key={title}
              href={href}
              className="flex flex-col items-start gap-3 hover:underline"
            >
              <Icon className="size-8 text-primary" />
              <h3 className="text-xl font-medium">{title}</h3>
              <p className="text-muted-foreground">{description}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export { HomeFeatures };

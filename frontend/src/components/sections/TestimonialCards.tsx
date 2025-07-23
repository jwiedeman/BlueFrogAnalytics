import { Avatar, AvatarImage } from "@/components/ui/avatar"

interface Testimonial {
  name: string
  title: string
  quote: string
  image: string
}

const testimonials: Testimonial[] = [
  {
    name: "Sarah L.",
    title: "Retail Owner",
    quote: "BlueFrogAnalytics gave us a professional web presence without the hassle. Our online sales are up 30%.",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
  },
  {
    name: "Jason T.",
    title: "Contractor",
    quote: "Their team keeps our site fast and secure so we can focus on projects. It just works.",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
  },
  {
    name: "Maria K.",
    title: "Cafe Manager",
    quote: "The monthly updates are a lifesaver and the dashboard makes tracking leads simple.",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
  },
]

const TestimonialCards = () => {
  return (
    <section className="py-16">
      <div className="container">
        <h2 className="mb-8 text-center text-3xl font-semibold">What Clients Say</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-lg border p-6 text-center">
              <Avatar className="mx-auto mb-4 size-16">
                <AvatarImage src={t.image} alt={t.name} />
              </Avatar>
              <p className="mb-4 italic text-muted-foreground">"{t.quote}"</p>
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { TestimonialCards }

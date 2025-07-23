import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BookingForm = () => {
  return (
    <section className="py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-center">Book a Consultation</h2>
        <p className="text-center text-muted-foreground">
          Choose a convenient time and we'll confirm your appointment via email.
        </p>
        <form className="space-y-4" method="post">
          <div>
            <Label htmlFor="name" className="mb-1 block">
              Full Name
            </Label>
            <Input id="name" name="name" required placeholder="Jane Doe" />
          </div>
          <div>
            <Label htmlFor="email" className="mb-1 block">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="mb-1 block">
                Preferred Date
              </Label>
              <Input id="date" type="date" name="date" required />
            </div>
            <div>
              <Label htmlFor="time" className="mb-1 block">
                Preferred Time
              </Label>
              <Input id="time" type="time" name="time" required />
            </div>
          </div>
          <div>
            <Label htmlFor="details" className="mb-1 block">
              Additional Details
            </Label>
            <textarea
              id="details"
              name="details"
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Let us know what you'd like to cover"
            ></textarea>
          </div>
          <div className="text-center">
            <Button type="submit">Book Now</Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export { BookingForm };

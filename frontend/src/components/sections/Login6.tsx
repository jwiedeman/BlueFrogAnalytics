// Import icons using explicit file path to avoid ESM directory resolution issues
import { FcGoogle } from "react-icons/fc/index.js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { initFirebase, getFirebaseAuth } from "@/lib/firebase"

function getErrorMessage(error: any) {
  const code = error?.code || "";
  switch (code) {
    case "auth/user-not-found":
      return "No account found with this email. Try signing in with Google.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/account-exists-with-different-credential":
    case "auth/email-already-in-use":
      return "Account exists with a different sign-in method. Try email and password.";
    default:
      return error?.message || "Authentication error";
  }
}

const Login6 = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getFirebaseAuth() || initFirebase();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  const handleGoogle = async () => {
    const auth = getFirebaseAuth() || initFirebase();
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="relative py-32">
      <div className="container">
        <div className="flex flex-col gap-4">
          <div className="mx-auto w-full max-w-sm rounded-md p-6">
            <div className="mb-6 flex flex-col items-center text-center">
              <a
                href="https://www.shadcnblocks.com"
                className="mb-6 flex items-center gap-2"
              >
                <img
                  src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblockscom-icon.svg"
                  className="max-h-8"
                  alt="Shadcn UI Navbar"
                />
              </a>
              <h1 className="text-2xl font-bold">Login</h1>
            </div>
            <div>
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                {error && (
                  <p className="text-sm text-red-600" role="alert">{error}</p>
                )}
                <Button type="submit" className="mt-4 w-full">
                  Sign in
                </Button>
              </form>
              <Button variant="outline" className="w-full mt-4" onClick={handleGoogle}>
                <FcGoogle className="mr-2 size-5" />
                Sign up with Google
              </Button>
              <div className="mx-auto mt-8 flex justify-center gap-1 text-sm text-muted-foreground">
                <p>Don&apos;t have an account?</p>
                <a
                  href="#"
                  className="font-medium text-primary hover:underline"
                >
                  Signup
                </a>
              </div>
              <a
                href="#"
                className="mt-3 flex justify-center text-sm font-medium hover:underline"
              >
                Forgot password
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Login6 }

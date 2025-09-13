import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/images/logo-flowshapr.png" 
              alt="Flowshapr Logo" 
              className="w-[300px] h-auto object-contain"
            />
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
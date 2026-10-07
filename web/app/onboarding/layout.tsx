import { Logo } from "@/components/app-shell";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-10">
      <Logo />
      <div className="mt-12">{children}</div>
    </div>
  );
}

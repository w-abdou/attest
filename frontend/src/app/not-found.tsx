import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="animate-fade-in mx-auto max-w-md py-16 text-center">
      <p className="text-5xl font-semibold tracking-tight text-sui-600">404</p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink-950">Page not found</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        That address does not match anything in Attest. If you followed a link to a document or
        team, it may have been removed — or you may not have access to it.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <LinkButton href="/dashboard">Go to dashboard</LinkButton>
        <LinkButton href="/teams" variant="secondary">Browse teams</LinkButton>
      </div>
    </div>
  );
}

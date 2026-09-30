import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <iframe
      title="Clean room"
      src="/clean-room/index.html"
      className="fixed inset-0 h-[100dvh] w-full border-0 bg-[#f4f1ea]"
    />
  );
}

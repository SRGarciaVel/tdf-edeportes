import type { ReactNode } from "react";
import Footer from "./Footer";
import Navbar from "./Navbar";
import TwitchChatPanel from "./TwitchChatPanel";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full">
        {children}
      </main>
      <Footer />
      <TwitchChatPanel />
    </div>
  );
}

import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import Philosophy from "@/components/Philosophy";
import Waitlist from "@/components/Waitlist";
import Reveal from "@/components/Reveal";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Philosophy />
        <Waitlist />
      </main>
      <Reveal />
    </>
  );
}

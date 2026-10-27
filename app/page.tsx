import WorldLayer from "@/components/WorldLayer";
import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import Philosophy from "@/components/Philosophy";
import Interlude from "@/components/Interlude";
import Waitlist from "@/components/Waitlist";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/Reveal";

export default function Home() {
  return (
    <>
      <WorldLayer />
      <SiteHeader />
      <main id="main">
        <Hero />
        <Philosophy />
        <Interlude />
        <Waitlist />
      </main>
      <SiteFooter />
      <Reveal />
    </>
  );
}

import { Benefits, FinalCta, Footer, Hero, HowItWorks, Nav, NicheStrip, PayPalStrip } from "@/components/landing/sections";

export default function Landing() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <NicheStrip />
        <Benefits />
        <HowItWorks />
        <PayPalStrip />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

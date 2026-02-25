import Hero from "@/components/sections/Hero";
import DishCarousel from "@/components/sections/DishCarousel";
import Features from "@/components/sections/Features";
import ReverseSearch from "@/components/sections/ReverseSearch";
import Social from "@/components/sections/Social";
import Pricing from "@/components/sections/Pricing";
import Faq from "@/components/sections/Faq";
import FinalCta from "@/components/sections/FinalCta";

export default function Home() {
  return (
    <>
      <Hero />
      <DishCarousel />
      <Features />
      <ReverseSearch />
      <Social />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}

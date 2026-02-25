import Hero from "@/components/sections/Hero";
import DishCarousel from "@/components/sections/DishCarousel";
import Features from "@/components/sections/Features";
import ReverseSearch from "@/components/sections/ReverseSearch";

export default function Home() {
  return (
    <main>
      <Hero />
      <DishCarousel />
      <Features />
      <ReverseSearch />
    </main>
  );
}

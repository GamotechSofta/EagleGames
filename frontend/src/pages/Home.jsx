import React from 'react';
import HeroSection from '../components/HeroSection';
import Section1 from '../components/Section1';
import GamesSection from '../components/GamesSection';

const Home = () => {
  return (
    <div className="min-h-screen min-h-ios-screen bg-transparent w-full max-w-full overflow-x-hidden">
      <HeroSection />
      <Section1 />
      <GamesSection />
    </div>
  );
};

export default Home;

import { About } from '@/components/about/About'
import { ExplorePill } from '@/components/explore/ExplorePill'
import { Header } from '@/components/hero/Header'
import { Faq } from '@/components/faq/Faq'
import { Footer } from '@/components/footer/Footer'
import { Hero } from '@/components/hero/Hero'
import { Intro } from '@/components/intro/Intro'
import { MapOverlay } from '@/components/map/MapOverlay'
import { Invest } from '@/components/invest/Invest'
import { People } from '@/components/people/People'
import { Partners } from '@/components/partners/Partners'
import { Stories } from '@/components/stories/Stories'
import { Thread } from '@/components/thread/Thread'
import { Vision } from '@/components/vision/Vision'
import { Weave } from '@/components/weave/Weave'
import { Zhabtog } from '@/components/zhabtog/Zhabtog'
import { Welcome } from '@/components/welcome/Welcome'
import { features } from '@/lib/features'
import { readOutline } from '@/lib/outline'

/** Home: loader → hero → welcome → about. Copy and media live in src/content/home.ts. */
export default function Home() {
  const outline = readOutline()
  return (
    <>
      <Intro outline={outline} />
      <Header />
      <main>
        <Hero />
        <Welcome />
        {/* hidden for now: switch it back on in src/lib/features.ts */}
        {features.weave && <Weave />}
        <About outline={outline} />
        <Vision />
        <Invest />
        <Stories outline={outline} />
        <People />
        <Partners />
        <Zhabtog />
        <Thread />
        <Faq />
      </main>
      <Footer />
      <ExplorePill />
      <MapOverlay />
    </>
  )
}

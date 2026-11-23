import { About } from '@/components/about/About'
import { ExplorePill } from '@/components/explore/ExplorePill'
import { Header } from '@/components/hero/Header'
import { Hero } from '@/components/hero/Hero'
import { Intro } from '@/components/intro/Intro'
import { Invest } from '@/components/invest/Invest'
import { Stories } from '@/components/stories/Stories'
import { Vision } from '@/components/vision/Vision'
import { Welcome } from '@/components/welcome/Welcome'
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
        <About outline={outline} />
        <Vision />
        <Invest />
        <Stories outline={outline} />
      </main>
      <ExplorePill />
    </>
  )
}

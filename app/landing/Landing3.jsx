import React from 'react'
import Register from './Register';
import Login from './Login';
import Landing2 from './Landing2';
import { RetroGrid } from '@/components/ui/retro-grid';
import { Particles } from '@/components/ui/particles';
const Home = () => {
  return (
    
    <div className='flex w-full'>
         <Particles
              className="absolute inset-0 z-0"
              quantity={120}
              color="#4D2FB2"
              ease={80}
              size={0.5}
            />
      <div className='w-1/2'>
        <Register/>
      </div>
      <div className='w-1/2'>
        <Login/>
      </div>

    </div>
  )
}

export default Home
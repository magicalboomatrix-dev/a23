

"use client";
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';


const HomeHeroBanner = () => {
  return (
    <div>
    <div className='banenrslider'>
    <div className='banenrinside'>
      <Swiper
      modules={[Navigation, Pagination, Autoplay]}
      spaceBetween={0}
      /*autoplay={{
        delay: 2500,
        speed: 4000,
        disableOnInteraction: false,
        }}*/
      slidesPerView={1}
      //navigation 
      //pagination={{ clickable: true }}
      onSlideChange={() => console.log('slide change')}
      onSwiper={(swiper) => console.log(swiper)}
      loop={true} 
    >
      <SwiperSlide><img src='/images/sl1.jpg' width="100%" /></SwiperSlide>
      <SwiperSlide><img src='/images/sl2.jpg' width="100%" /></SwiperSlide>
      <SwiperSlide><img src='/images/sl3.jpg' width="100%" /></SwiperSlide>
    </Swiper>
    </div>
    </div>
    <style jsx>{`
        

    `}</style>
    </div>
  )
}

export default HomeHeroBanner






"use client";
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';


const HomeNewLaunch = () => {
  return (
    <div>
    <div className='newlaunch'>
    <div className='newlaunchinside'>
       <div className="notice-bar"><span className="title-text">New Launch</span></div>
      <Swiper
      modules={[Navigation, Pagination, Autoplay]}
      spaceBetween={2}
      autoplay={{
        delay: 1500,
        speed: 4000,
        disableOnInteraction: false,
        }}
      slidesPerView={4}
      //navigation 
      //pagination={{ clickable: true }}
      onSlideChange={() => console.log('slide change')}
      onSwiper={(swiper) => console.log(swiper)}
      loop={true}
    >
      <SwiperSlide><img src='/images/new-launch-img1.webp' width="100%" /></SwiperSlide>
      <SwiperSlide><img src='/images/new-launch-img2.webp' width="100%" /></SwiperSlide>
      <SwiperSlide><img src='/images/new-launch-img3.webp' width="100%" /></SwiperSlide>
      <SwiperSlide><img src='/images/new-launch-img4.webp' width="100%" /></SwiperSlide>
      <SwiperSlide><img src='/images/new-launch-img5.png' width="100%" /></SwiperSlide>
      <SwiperSlide><img src='/images/new-launch-img6.webp' width="100%" /></SwiperSlide>
      <SwiperSlide><img src='/images/new-launch-img7.webp' width="100%" /></SwiperSlide>

    </Swiper>
    </div>
    </div>
    </div>
  )
}

export default HomeNewLaunch



